import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redoble, triggerVoice } from '../../../audio/voices';
import { TRACKS, VELOCIDADES, padsDelBanco } from '../../../data/mesa';
import { applyMix, hitPad, isAudible, trackIndexOf, triggerTrack } from './drumKit';

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
