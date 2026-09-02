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
