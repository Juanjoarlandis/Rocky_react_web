// EL KIT DE LA MESA — traduce pistas y pads a voces del motor.
// No sabe de React ni de reloj: le dicen qué golpe, cuándo y cómo de fuerte,
// y él elige la voz, el bus y la afinación que tocan.

import { redoble, triggerVoice } from '../../../audio/voices';
import { TRACKS, TRACK_IDS, VELOCIDADES } from '../../../data/mesa';

// El 808 sigue la tonalidad elegida dos octavas por debajo de la tónica
const SUB_OCTAVES_DOWN = 24;

// ¿Suena la pista con esta mezcla? Si hay algún solo, sólo suenan los solos.
export function isAudible(index, { mutes, solos }) {
  return solos.some(Boolean) ? Boolean(solos[index]) : !mutes[index];
}

// Las pistas que suenan de verdad: con algún paso encendido y audibles con
// esta mezcla. Es lo que saca a bailar al público de La Colmena.
export function pistasQueSuenan(pattern, mezcla) {
  return pattern.map((steps, index) => steps.some(Boolean) && isAudible(index, mezcla));
}

/* Cómo está el público de La Colmena (reacciones-del-publico): con la mesa en
   marcha baila quien suena, duerme quien tiene pasos pero está callado (su
   mute o el solo de otra) y se sienta quien no tiene nada que tocar. `solo`
   marca a quien suena con su solo puesto y `lleno`, que suenan las ocho. */
export function estadosDelPublico(pattern, { mutes, solos, playing }) {
  const suenan = playing ? pistasQueSuenan(pattern, { mutes, solos }) : pattern.map(() => false);
  const miembros = pattern.map((steps, index) => ({
    estado: suenan[index] ? 'baila' : playing && steps.some(Boolean) ? 'duerme' : 'sentado',
    solo: suenan[index] && Boolean(solos[index]),
  }));
  return { miembros, lleno: suenan.length > 0 && suenan.every(Boolean) };
}

// El mezclador se refleja en los buses: la pista callada baja a cero
export function applyMix(engine, { levels, mutes, solos }) {
  if (!engine) return;
  TRACKS.forEach((track, i) => {
    engine.setTrackLevel(track.id, isAudible(i, { mutes, solos }) ? levels[i] : 0);
  });
}

// Dispara una pista del secuenciador con la velocidad de su celda (1-3).
// `tonic` es la nota MIDI de la tonalidad, para las pistas que la siguen.
export function triggerTrack(engine, index, time, velocity, { tonic } = {}) {
  const track = TRACKS[index];
  if (!engine || !track) return;
  const opts = {
    ...track.opts,
    gain: VELOCIDADES[velocity] ?? VELOCIDADES[2],
    out: engine.busFor(track.id),
  };
  if (track.usaTonica) opts.midi = tonic - SUB_OCTAVES_DOWN;
  triggerVoice(engine, track.voz, time, opts);
}

// Golpea un pad: una voz suelta, o un redoble que dura lo que diga el tempo.
// Los pads que tienen pista salen por su bus; el resto, por el de pads.
export function hitPad(engine, pad, time, { bpm }) {
  if (!engine || !pad) return;
  const opts = {
    ...pad.opts,
    gain: pad.opts?.gain ?? 1,
    out: pad.track ? engine.busFor(pad.track) : engine.padBus,
  };
  if (pad.redoble) {
    const duration = (60 / bpm) * pad.redoble.pulsos;
    redoble(engine, pad.voz, time, opts, pad.redoble.veces, duration);
  } else {
    triggerVoice(engine, pad.voz, time, opts);
  }
}

// Pista de la rejilla en la que graba un pad, o -1 si no cae en ninguna
export function trackIndexOf(pad) {
  return TRACK_IDS.indexOf(pad?.track);
}
