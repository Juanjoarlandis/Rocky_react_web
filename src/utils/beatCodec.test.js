import { describe, expect, it } from 'vitest';
import {
  BPM_DEFAULT,
  BPM_MAX,
  BPM_MIN,
  SWING_DEFAULT,
  SWING_MAX,
  SWING_MIN,
  clampBpm,
  clampSwing,
  decodePattern,
  emptyPattern,
  encodePattern,
  isEmptyPattern,
  normalizePattern,
  patternFromRows,
  STEP_COUNT,
  TRACK_COUNT,
} from './beatCodec';

describe('beatCodec', () => {
  it('codifica y decodifica un patrón con velocidades sin pérdidas', () => {
    const pattern = emptyPattern();
    pattern[0][0] = 3;
    pattern[0][7] = 1;
    pattern[1][4] = 2;
    pattern[2][15] = 1;
    pattern[3][10] = 3;
    pattern[7][8] = 2;

    const code = encodePattern(pattern);
    expect(code).toMatch(/^2[0-9a-f]{64}$/);
    expect(decodePattern(code)).toEqual(pattern);
  });

  it('el patrón vacío es todo ceros', () => {
    expect(encodePattern(emptyPattern())).toBe(`2${'0'.repeat(64)}`);
    expect(isEmptyPattern(emptyPattern())).toBe(true);
  });

  it('sigue abriendo los enlaces antiguos de cuatro pistas', () => {
    // 'ffff...' = las dieciséis semicorcheas del bombo encendidas
    const antiguo = decodePattern('ffff000000000000');
    expect(antiguo).toHaveLength(TRACK_COUNT);
    expect(antiguo[0].every((v) => v === 2)).toBe(true);
    expect(antiguo[4].every((v) => v === 0)).toBe(true);
  });

  it('rechaza códigos inválidos', () => {
    expect(decodePattern('nope')).toBeNull();
    expect(decodePattern('zzzzzzzzzzzzzzzz')).toBeNull();
    expect(decodePattern('123')).toBeNull();
    expect(decodePattern(`2${'0'.repeat(63)}`)).toBeNull();
    expect(decodePattern(42)).toBeNull();
  });

  it('decodifica con las dimensiones correctas', () => {
    const pattern = decodePattern(encodePattern(emptyPattern()));
    expect(pattern).toHaveLength(TRACK_COUNT);
    expect(pattern[0]).toHaveLength(STEP_COUNT);
  });

  it('normaliza patrones con forma rara', () => {
    const raro = normalizePattern([[9, -3, 'x'], 'no soy pista']);
    expect(raro).toHaveLength(TRACK_COUNT);
    expect(raro[0].slice(0, 3)).toEqual([3, 0, 0]);
    expect(raro[1].every((v) => v === 0)).toBe(true);
  });

  it('lee patrones escritos a mano en texto', () => {
    const pattern = patternFromRows({ bombo: 'X..x............', caja: '....o...........' }, [
      'bombo',
      'caja',
    ]);
    expect(pattern[0][0]).toBe(3);
    expect(pattern[0][3]).toBe(2);
    expect(pattern[0][1]).toBe(0);
    expect(pattern[1][4]).toBe(1);
  });

  it('limita el BPM al rango de la mesa', () => {
    expect(clampBpm(95)).toBe(95);
    expect(clampBpm(20)).toBe(60);
    expect(clampBpm(400)).toBe(180);
    expect(clampBpm('no-numérico')).toBe(95);
    expect(clampBpm('120')).toBe(120);
  });

  it('publica el rango de tempo que usan los mandos', () => {
    expect(BPM_MIN).toBe(60);
    expect(BPM_MAX).toBe(180);
    expect(BPM_DEFAULT).toBe(95);
    expect(clampBpm(BPM_MIN - 1)).toBe(BPM_MIN);
    expect(clampBpm(BPM_MAX + 1)).toBe(BPM_MAX);
    expect(clampBpm(undefined)).toBe(BPM_DEFAULT);
  });

  it('limita el swing entre recto y tresillo largo', () => {
    expect(clampSwing(0)).toBe(0);
    expect(clampSwing(0.24)).toBe(0.24);
    expect(clampSwing(9)).toBe(0.7);
    expect(clampSwing(-1)).toBe(0);
    expect(clampSwing('bailando')).toBe(0);
  });

  it('publica el rango de swing que usan los mandos', () => {
    expect(SWING_MIN).toBe(0);
    expect(SWING_MAX).toBe(0.7);
    expect(SWING_DEFAULT).toBe(0);
    expect(clampSwing(SWING_MAX + 0.5)).toBe(SWING_MAX);
    expect(clampSwing(undefined)).toBe(SWING_DEFAULT);
  });
});
