import { describe, expect, it } from 'vitest';
import { BANCOS, PAD_TECLAS, PRESETS, TONALIDADES, TRACKS, TRACK_IDS, padsDelBanco } from './mesa';
import { STEP_COUNT, TRACK_COUNT } from '../utils/beatCodec';
import { VOICE_NAMES } from '../audio/voices';

describe('datos de la mesa', () => {
  it('tiene una pista por hueco del códec', () => {
    expect(TRACKS).toHaveLength(TRACK_COUNT);
    expect(new Set(TRACK_IDS).size).toBe(TRACK_COUNT);
  });

  it('cada pista apunta a una voz que existe', () => {
    TRACKS.forEach((track) => expect(VOICE_NAMES).toContain(track.voz));
  });

  it('los ritmos de fábrica traen las 16 semicorcheas de cada pista', () => {
    PRESETS.forEach((preset) => {
      TRACK_IDS.forEach((id) => {
        expect(preset.rows[id], `${preset.id} · ${id}`).toHaveLength(STEP_COUNT);
        expect(preset.rows[id]).toMatch(/^[.\-oxX]{16}$/);
      });
      expect(preset.bpm).toBeGreaterThan(59);
    });
  });

  it('cada banco reparte 16 pads con voz conocida', () => {
    BANCOS.forEach((banco) => {
      const pads = padsDelBanco(banco.id, TONALIDADES[0].midi);
      expect(pads).toHaveLength(PAD_TECLAS.length);
      pads.forEach((pad) => expect(VOICE_NAMES).toContain(pad.voz));
      expect(new Set(pads.map((p) => p.id)).size).toBe(pads.length);
    });
  });

  it('el banco de teclas sigue la tonalidad elegida', () => {
    const enDo = padsDelBanco('teclas', 60);
    const enFa = padsDelBanco('teclas', 65);
    expect(enDo[0].opts.midi).toBe(48);
    expect(enFa[0].opts.midi).toBe(53);
    expect(enDo[7].opts.midi - enDo[0].opts.midi).toBe(12);
  });

  it('los pads con tónica se afinan con la tonalidad', () => {
    const kit = padsDelBanco('kit', 62);
    const ochenta = kit.find((p) => p.id === 'sub');
    expect(ochenta.opts.midi).toBe(38);
  });
});
