import fs from 'node:fs/promises';
import { ensureLogger } from '../../lib/logger.mjs';
import { createSerialQueue } from '../../lib/serial-queue.mjs';
import { EncryptedStore } from '../../storage/encrypted-file-store.mjs';

// LA PARED EN DISCO (design.md D1) — un fichero cifrado propio, aparte del
// estado general, que se escribe como mucho una vez por ventana: la tarjeta SD
// de la Raspberry no aguanta un volcado entero por cada trazo. Si el fichero
// no se puede leer, el arranque sigue (sin pared) y no se pisa hasta que
// alguien decida apartarlo. Sin clave de cifrado, la pared vive en memoria.

const NAMESPACE = 'pared';
const KEY = 'estado';
const RETRASO_MS = 60_000;

export function createWallPersistence({
  filePath,
  key,
  obtener,
  retrasoMs = RETRASO_MS,
  logger,
  clock = () => Date.now(),
}) {
  const log = ensureLogger(logger);
  const enCola = createSerialQueue();
  let store = key ? new EncryptedStore({ filePath, key }) : null;
  let corrupto = false;
  let timer = null;
  let pendiente = false;

  function programar() {
    pendiente = true;
    if (timer || !store || corrupto) return;
    timer = setTimeout(() => {
      timer = null;
      enCola(escribir);
    }, retrasoMs);
    timer.unref?.();
  }

  async function escribir() {
    if (!store || corrupto || !pendiente) return;
    pendiente = false;
    try {
      await store.set(NAMESPACE, KEY, obtener());
    } catch (error) {
      log.error('No se ha podido guardar la pared', { reason: error?.code || 'error' });
      // Se vuelve a intentar con el mismo retraso, aunque no haya más cambios.
      programar();
    }
  }

  return {
    get corrupto() {
      return corrupto;
    },

    async cargar() {
      if (!store) return { estado: null, corrupto: false };
      try {
        return { estado: await store.get(NAMESPACE, KEY), corrupto: false };
      } catch {
        corrupto = true;
        log.error('No se ha podido leer la pared: se arranca sin ella y apagada', {
          reason: 'wall_file_unreadable',
        });
        return { estado: null, corrupto: true };
      }
    },

    programar,

    async volcar() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await enCola(escribir);
    },

    // Guarda el fichero ilegible aparte (para revisarlo) y empieza uno nuevo.
    async apartarCorrupto() {
      if (!corrupto) return;
      const marca = new Date(clock())
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d+Z$/, 'Z');
      await fs.rename(filePath, `${filePath}.corrupto-${marca}`);
      store = new EncryptedStore({ filePath, key });
      corrupto = false;
      log.warn('Pared: fichero ilegible apartado, se empieza uno nuevo', {});
    },
  };
}
