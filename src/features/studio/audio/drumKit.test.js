import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redoble, triggerVoice } from '../../../audio/voices';
import { TRACKS, VELOCIDADES, padsDelBanco } from '../../../data/mesa';
import {
  applyMix,
  estadosDelPublico,
  hitPad,
  isAudible,
  pistasQueSuenan,
  trackIndexOf,
  triggerTrack,
} from './drumKit';

// Las voces sintetizan de verdad y en jsdom no hay Web Audio: aquí sólo
// importa a qué voz, con qué bus y con qué fuerza se llama.
vi.mock('../../../audio/voices', () => ({
  triggerVoice: vi.fn(),
  redoble: vi.fn(),
}));

function fakeEngine() {
  return {
    padBus: 'bus:pads',
    busFor: vi.fn((id) => `bus:${id}`),
    setTrackLevel: vi.fn(),
  };
}

const NADIE = { mutes: TRACKS.map(() => false), solos: TRACKS.map(() => false) };

describe('el kit de la mesa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('con un solo sólo suena el solo; si no, manda el mute', () => {
    expect(isAudible(0, NADIE)).toBe(true);
    expect(isAudible(0, { ...NADIE, mutes: [true] })).toBe(false);
    const solos = TRACKS.map((_, i) => i === 2);
    expect(isAudible(2, { ...NADIE, solos })).toBe(true);
    expect(isAudible(0, { ...NADIE, solos })).toBe(false);
  });

  it('refleja el mezclador en los buses y baja a cero las pistas calladas', () => {
    const engine = fakeEngine();
    const levels = TRACKS.map((_, i) => 0.1 * (i + 1));
    applyMix(engine, { levels, mutes: TRACKS.map((_, i) => i === 1), solos: NADIE.solos });

    expect(engine.setTrackLevel).toHaveBeenCalledWith('bombo', 0.1);
    expect(engine.setTrackLevel).toHaveBeenCalledWith('caja', 0);
    expect(engine.setTrackLevel).toHaveBeenCalledTimes(TRACKS.length);
    // Sin motor no hay nada que ajustar, y no revienta
    expect(() => applyMix(null, { levels, ...NADIE })).not.toThrow();
  });

  it('dispara la pista con la fuerza de su celda por su propio bus', () => {
    const engine = fakeEngine();
    triggerTrack(engine, 0, 1.5, 3, { tonic: 60 });

    expect(triggerVoice).toHaveBeenCalledWith(
      engine,
      'bombo',
      1.5,
      expect.objectContaining({ gain: VELOCIDADES[3], out: 'bus:bombo', pitch: 52 })
    );
  });

  it('afina el 808 dos octavas por debajo de la tónica', () => {
    const engine = fakeEngine();
    const sub = TRACKS.findIndex((t) => t.id === 'sub');
    triggerTrack(engine, sub, 0, 2, { tonic: 62 });

    expect(triggerVoice).toHaveBeenCalledWith(
      engine,
      'sub',
      0,
      expect.objectContaining({ midi: 38 })
    );
    // El bombo no sigue la tonalidad
    triggerTrack(engine, 0, 0, 2, { tonic: 62 });
    expect(triggerVoice.mock.calls[1][3].midi).toBeUndefined();
  });

  it('una velocidad desconocida suena como golpe normal', () => {
    const engine = fakeEngine();
    triggerTrack(engine, 1, 0, 9);
    expect(triggerVoice.mock.calls[0][3].gain).toBe(VELOCIDADES[2]);
  });

  it('sin motor o sin pista no dispara nada', () => {
    triggerTrack(null, 0, 0, 2);
    triggerTrack(fakeEngine(), 99, 0, 2);
    expect(triggerVoice).not.toHaveBeenCalled();
  });

  it('un pad con pista sale por su bus; el resto, por el de pads', () => {
    const engine = fakeEngine();
    const kit = padsDelBanco('kit', 60);
    const caja = kit.find((p) => p.id === 'caja');
    const rim = kit.find((p) => p.id === 'rim');

    hitPad(engine, caja, 0.5, { bpm: 120 });
    hitPad(engine, rim, 0.6, { bpm: 120 });

    expect(triggerVoice).toHaveBeenNthCalledWith(
      1,
      engine,
      'caja',
      0.5,
      expect.objectContaining({ out: 'bus:caja', gain: 1 })
    );
    expect(triggerVoice).toHaveBeenNthCalledWith(
      2,
      engine,
      'rim',
      0.6,
      expect.objectContaining({ out: 'bus:pads' })
    );
  });

  it('el redoble dura lo que diga el tempo', () => {
    const engine = fakeEngine();
    const roll = padsDelBanco('kit', 60).find((p) => p.id === 'redoble-caja');
    hitPad(engine, roll, 2, { bpm: 120 });

    // Un pulso a 120 bpm son 0,5 s, repartidos en ocho golpes
    expect(redoble).toHaveBeenCalledWith(engine, 'caja', 2, expect.any(Object), 8, 0.5);
    expect(triggerVoice).not.toHaveBeenCalled();
  });

  it('sabe en qué pista de la rejilla graba cada pad', () => {
    const kit = padsDelBanco('kit', 60);
    expect(trackIndexOf(kit.find((p) => p.id === 'hatab'))).toBe(5);
    expect(trackIndexOf(kit.find((p) => p.id === 'rim'))).toBe(-1);
    expect(trackIndexOf(undefined)).toBe(-1);
  });
});

describe('quién suena (para el público de La Colmena)', () => {
  const vacio = () => Array.from({ length: 8 }, () => Array(16).fill(0));
  const nadie = Array(8).fill(false);

  it('una pista suena si tiene algún paso y no está callada', () => {
    const pattern = vacio();
    pattern[0][0] = 3;
    pattern[2][4] = 1;
    expect(pistasQueSuenan(pattern, { mutes: nadie, solos: nadie })).toEqual([
      true,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('el mute y el solo de otra pista la callan', () => {
    const pattern = vacio();
    pattern[0][0] = 3;
    pattern[1][4] = 3;
    const mutes = [...nadie];
    mutes[0] = true;
    expect(pistasQueSuenan(pattern, { mutes, solos: nadie }).slice(0, 2)).toEqual([false, true]);
    const solos = [...nadie];
    solos[0] = true;
    expect(pistasQueSuenan(pattern, { mutes: nadie, solos }).slice(0, 2)).toEqual([true, false]);
  });

  it('el público: baila quien suena, duerme quien tiene pasos y está callado, y el resto se sienta', () => {
    const pattern = vacio();
    pattern[0][0] = 3; // bombo
    pattern[1][4] = 3; // caja
    pattern[2][2] = 1; // hi-hat
    const mutes = [...nadie];
    mutes[1] = true;
    const { miembros, lleno } = estadosDelPublico(pattern, { mutes, solos: nadie, playing: true });
    expect(miembros.slice(0, 4).map((m) => m.estado)).toEqual([
      'baila',
      'duerme',
      'baila',
      'sentado',
    ]);
    expect(miembros.some((m) => m.solo)).toBe(false);
    expect(lleno).toBe(false);
  });

  it('el público: el solo pone el foco en quien suena y duerme a los demás con pasos', () => {
    const pattern = vacio();
    pattern[0][0] = 3;
    pattern[1][4] = 3;
    pattern[2][2] = 1;
    const solos = [...nadie];
    solos[2] = true;
    const { miembros } = estadosDelPublico(pattern, { mutes: nadie, solos, playing: true });
    expect(miembros.slice(0, 4).map((m) => m.estado)).toEqual([
      'duerme',
      'duerme',
      'baila',
      'sentado',
    ]);
    expect(miembros.map((m) => m.solo)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('el público: el solo de una pista sin pasos no tiene foco, porque no suena', () => {
    const pattern = vacio();
    pattern[0][0] = 3;
    const solos = [...nadie];
    solos[3] = true;
    const { miembros } = estadosDelPublico(pattern, { mutes: nadie, solos, playing: true });
    expect(miembros[3]).toEqual({ estado: 'sentado', solo: false });
    expect(miembros[0].estado).toBe('duerme');
  });

  it('el público: con la mesa parada nadie duerme ni tiene foco, aunque haya mutes y solos', () => {
    const pattern = vacio();
    pattern[0][0] = 3;
    pattern[1][4] = 3;
    const mutes = [...nadie];
    mutes[1] = true;
    const solos = [...nadie];
    solos[0] = true;
    const { miembros, lleno } = estadosDelPublico(pattern, { mutes, solos, playing: false });
    expect(miembros.every((m) => m.estado === 'sentado' && !m.solo)).toBe(true);
    expect(lleno).toBe(false);
  });

  it('el público: lleno solo cuando suenan las ocho pistas', () => {
    const ocho = vacio().map((steps) => steps.map((_, i) => (i === 0 ? 2 : 0)));
    const mezcla = { mutes: nadie, solos: nadie, playing: true };
    expect(estadosDelPublico(ocho, mezcla).lleno).toBe(true);
    const siete = ocho.map((steps, i) => (i === 7 ? steps.map(() => 0) : steps));
    expect(estadosDelPublico(siete, mezcla).lleno).toBe(false);
    const mutes = [...nadie];
    mutes[4] = true;
    expect(estadosDelPublico(ocho, { ...mezcla, mutes }).lleno).toBe(false);
    expect(estadosDelPublico(ocho, { ...mezcla, playing: false }).lleno).toBe(false);
  });

  it('sin pasos no suena nada', () => {
    expect(pistasQueSuenan(vacio(), { mutes: nadie, solos: nadie }).some(Boolean)).toBe(false);
  });
});
