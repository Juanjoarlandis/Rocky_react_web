import { describe, expect, it } from 'vitest';
import {
  BANCOS,
  BARRO_DURACION,
  CORTES_BARRO,
  PAD_TECLAS,
  PRESETS,
  PUBLICO,
  TONALIDADES,
  TRACKS,
  TRACK_IDS,
  padsDelBanco,
} from './mesa';
import { STEP_COUNT, TONO_IDS, TRACK_COUNT } from '../utils/beatCodec';
import { VOICE_NAMES } from '../audio/voices';

describe('datos de la mesa', () => {
  it('las tonalidades son las que acepta el ranking del servidor', () => {
    expect(TONALIDADES.map((tonalidad) => tonalidad.id)).toEqual([...TONO_IDS]);
  });

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

  it('BARRO tiene 16 cortes con nombre, dentro del tema y sin repetir id', () => {
    expect(CORTES_BARRO).toHaveLength(16);
    expect(new Set(CORTES_BARRO.map((corte) => corte.id)).size).toBe(16);
    CORTES_BARRO.forEach((corte) => {
      expect(corte.label.trim()).not.toBe('');
      expect(corte.inicio).toBeGreaterThanOrEqual(0);
      expect(corte.duracion).toBeGreaterThan(0);
      expect(corte.inicio + corte.duracion).toBeLessThanOrEqual(BARRO_DURACION);
    });
  });

  it('el banco BARRO toca cortes y no graba en ninguna pista', () => {
    expect(BANCOS.map((banco) => banco.id)).toContain('barro');
    const pads = padsDelBanco('barro', TONALIDADES[0].midi);
    expect(pads.map((pad) => pad.corte)).toEqual(CORTES_BARRO.map((corte) => corte.id));
    pads.forEach((pad) => {
      expect(pad.voz).toBe('corte');
      expect(pad.track).toBeUndefined();
    });
    // Los cortes no se afinan con el tono.
    expect(padsDelBanco('barro', 60)).toEqual(padsDelBanco('barro', 69));
  });

  it('el público tiene un personaje por pista, sin repetir', () => {
    expect(Object.keys(PUBLICO).sort()).toEqual([...TRACK_IDS].sort());
    const personajes = Object.values(PUBLICO);
    expect(new Set(personajes).size).toBe(TRACK_IDS.length);
  });
});
