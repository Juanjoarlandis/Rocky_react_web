import crypto from 'node:crypto';
import { createSerialQueue } from '../lib/serial-queue.mjs';
import {
  BPM_MAX,
  BPM_MIN,
  SWING_MAX,
  SWING_MIN,
  TONO_IDS,
  decodePattern,
  isEmptyPattern,
} from '../../shared/beat-codec.mjs';
import { isAllowedText } from './beats-filter.mjs';

// El ranking de La Colmena: los beats que la gente monta en la mesa, con sus
// likes. Un beat es sólo su código (el patrón de la mesa), su tempo, swing y
// tono, un nombre y un apodo: nada de audio, suena en el navegador de quien
// lo escucha con el mismo motor de la mesa.
//
// Quien vota es la sesión (cookie HttpOnly que ya usa el carrito): un like
// por navegador. Del identificador sólo se guardan 16 caracteres del hash,
// suficiente para distinguir y corto porque el almacén se reescribe entero.

export const BEATS_NAMESPACE = 'beats';
const INDEX_KEY = '!indice';
export const MAX_BEATS = 1000;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1_000;
const DAY_MS = 24 * 60 * 60 * 1_000;
export const REPORTS_TO_HIDE = 3;
export const PUBLISH_PER_DAY = 10;
export const LIST_LIMIT = 30;
export const ORDERS = Object.freeze(['semana', 'nuevos']);

const NAME_RE = /^[\p{L}\p{N} '’\-_.!?¿¡&#+]+$/u;
const ALIAS_RE = /^[\p{L}\p{N} _.-]+$/u;
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function voterKeyOf(session) {
  return session?.key ? String(session.key).slice(0, 16) : null;
}

export function isBeatId(value) {
  return typeof value === 'string' && ID_RE.test(value);
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

/* Lo que llega del navegador, ya pasado por el esquema de la ruta, se
   comprueba aquí contra las reglas de la mesa y el filtro. Devuelve el beat
   limpio o el motivo, en castellano, para enseñárselo a quien publica. */
export function checkSubmission({ code, bpm, swing, tono, name, alias }) {
  const pattern = decodePattern(code);
  if (!pattern || !String(code).startsWith('2')) {
    return { error: 'Ese beat no viene de la mesa.' };
  }
  if (isEmptyPattern(pattern)) return { error: 'Un beat vacío no suena: pon algún golpe.' };
  if (!Number.isInteger(bpm) || bpm < BPM_MIN || bpm > BPM_MAX) {
    return { error: 'Ese tempo no cabe en la mesa.' };
  }
  const swingValue = Math.round(Number(swing) * 100) / 100;
  if (!Number.isFinite(swingValue) || swingValue < SWING_MIN || swingValue > SWING_MAX) {
    return { error: 'Ese swing no cabe en la mesa.' };
  }
  if (!TONO_IDS.includes(tono)) return { error: 'Esa tonalidad no está en la mesa.' };

  const cleanName = cleanText(name);
  const cleanAlias = cleanText(alias);
  if (!cleanName || cleanName.length > 32 || !NAME_RE.test(cleanName)) {
    return { error: 'El nombre del beat: hasta 32 letras, números y poco más.' };
  }
  if (cleanAlias.length < 2 || cleanAlias.length > 20 || !ALIAS_RE.test(cleanAlias)) {
    return { error: 'Tu apodo: de 2 a 20 letras o números.' };
  }
  if (!isAllowedText(cleanName) || !isAllowedText(cleanAlias)) {
    return { error: 'Ese nombre no puede ir en el ranking. Prueba con otro.' };
  }
  return {
    beat: {
      code: code.toLowerCase(),
      bpm,
      swing: swingValue,
      tono,
      name: cleanName,
      alias: cleanAlias,
    },
  };
}

function weekLikes(record, now) {
  return Object.values(record.likes || {}).filter((at) => at >= now - WEEK_MS).length;
}

function totalLikes(record) {
  return Object.keys(record.likes || {}).length;
}

function publicView(record, voterKey, now) {
  return {
    id: record.id,
    name: record.name,
    alias: record.alias,
    code: record.code,
    bpm: record.bpm,
    swing: record.swing,
    tono: record.tono,
    createdAt: new Date(record.createdAt).toISOString(),
    likes: totalLikes(record),
    weekLikes: weekLikes(record, now),
    liked: Boolean(voterKey && record.likes?.[voterKey]),
    mine: Boolean(voterKey && record.author === voterKey),
  };
}

// Si el ranking se llena, se va antes lo oculto, luego lo viejo con pocos
// likes y, en último caso, lo más viejo.
function evictionVictim(records) {
  const byAge = [...records].sort((a, b) => a.createdAt - b.createdAt);
  return (
    byAge.find((record) => record.hidden) ||
    byAge.find((record) => totalLikes(record) < 3) ||
    byAge[0]
  );
}

export function createBeatsService({ store, clock = () => Date.now(), maxBeats = MAX_BEATS }) {
  // Las escrituras van en fila india: get y set son atómicos por separado y
  // dos likes a la vez se pisarían el registro entre medias.
  const enFila = createSerialQueue();

  async function readIndex() {
    return (await store.get(BEATS_NAMESPACE, INDEX_KEY)) ?? [];
  }

  async function readAll() {
    const ids = await readIndex();
    const records = await Promise.all(ids.map((id) => store.get(BEATS_NAMESPACE, id)));
    return records.filter(Boolean);
  }

  return {
    async list({ order = 'semana', voterKey = null, limit = LIST_LIMIT } = {}) {
      const now = clock();
      const visible = (await readAll()).filter((record) => !record.hidden);
      const sorted =
        order === 'nuevos'
          ? visible.sort((a, b) => b.createdAt - a.createdAt)
          : visible.sort(
              (a, b) =>
                weekLikes(b, now) - weekLikes(a, now) ||
                totalLikes(b) - totalLikes(a) ||
                b.createdAt - a.createdAt
            );
      return sorted.slice(0, limit).map((record) => publicView(record, voterKey, now));
    },

    async publish(beat, voterKey) {
      return enFila(async () => {
        const now = clock();
        const records = await readAll();
        const twin = records.find(
          (record) =>
            record.code === beat.code &&
            record.bpm === beat.bpm &&
            record.swing === beat.swing &&
            record.tono === beat.tono
        );
        if (twin) return { status: 'duplicate', beat: publicView(twin, voterKey, now) };

        const today = records.filter(
          (record) => record.author === voterKey && record.createdAt >= now - DAY_MS
        );
        if (today.length >= PUBLISH_PER_DAY) return { status: 'limit' };

        let ids = await readIndex();
        if (ids.length >= maxBeats) {
          const victim = evictionVictim(records);
          await store.delete(BEATS_NAMESPACE, victim.id);
          ids = ids.filter((id) => id !== victim.id);
        }
        const record = {
          id: crypto.randomBytes(8).toString('base64url'),
          ...beat,
          createdAt: now,
          author: voterKey,
          likes: {},
          reports: {},
          hidden: false,
        };
        await store.set(BEATS_NAMESPACE, record.id, record);
        await store.set(BEATS_NAMESPACE, INDEX_KEY, [...ids, record.id]);
        return { status: 'created', beat: publicView(record, voterKey, now) };
      });
    },

    // Like o, si ya lo había, se quita: el corazón funciona como interruptor.
    async toggleLike(id, voterKey) {
      return enFila(async () => {
        const record = await store.get(BEATS_NAMESPACE, id);
        if (!record || record.hidden) return null;
        const likes = { ...(record.likes || {}) };
        if (likes[voterKey]) delete likes[voterKey];
        else likes[voterKey] = clock();
        const updated = { ...record, likes };
        // Un voto no espera al disco: si una caída lo pierde, no consta y ya.
        await store.set(BEATS_NAMESPACE, id, updated, { durability: 'deferred' });
        return { liked: Boolean(likes[voterKey]), likes: totalLikes(updated) };
      });
    },

    // Tres reportes de navegadores distintos lo ocultan hasta que alguien de
    // la casa lo mire.
    async report(id, voterKey) {
      return enFila(async () => {
        const record = await store.get(BEATS_NAMESPACE, id);
        if (!record) return null;
        const reports = { ...(record.reports || {}), [voterKey]: clock() };
        const hidden = record.hidden || Object.keys(reports).length >= REPORTS_TO_HIDE;
        // Un reporte suelto no espera al disco; el que oculta el beat sí: una
        // caída no puede volver a enseñar algo ya retirado por moderación.
        const hides = hidden && !record.hidden;
        await store.set(
          BEATS_NAMESPACE,
          id,
          { ...record, reports, hidden },
          { durability: hides ? 'confirmed' : 'deferred' }
        );
        return { hidden };
      });
    },

    async remove(id) {
      return enFila(async () => {
        const existed = await store.delete(BEATS_NAMESPACE, id);
        const ids = await readIndex();
        if (ids.includes(id)) {
          await store.set(
            BEATS_NAMESPACE,
            INDEX_KEY,
            ids.filter((other) => other !== id)
          );
        }
        return Boolean(existed);
      });
    },
  };
}
