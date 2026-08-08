import { describe, expect, it } from 'vitest';
import {
    clampBpm,
    decodePattern,
    emptyPattern,
    encodePattern,
    STEP_COUNT,
    TRACK_COUNT,
} from './beatCodec';

describe('beatCodec', () => {
    it('codifica y decodifica un patrón sin pérdidas', () => {
        const pattern = emptyPattern();
        pattern[0][0] = 1;
        pattern[0][7] = 1;
        pattern[1][4] = 1;
        pattern[2][15] = 1;
        pattern[3][10] = 1;

        const code = encodePattern(pattern);
        expect(code).toMatch(/^[0-9a-f]{16}$/);
        expect(decodePattern(code)).toEqual(pattern);
    });

    it('el patrón vacío produce dieciséis ceros', () => {
        expect(encodePattern(emptyPattern())).toBe('0000000000000000');
    });

    it('rechaza códigos inválidos', () => {
        expect(decodePattern('nope')).toBeNull();
        expect(decodePattern('zzzzzzzzzzzzzzzz')).toBeNull();
        expect(decodePattern('123')).toBeNull();
        expect(decodePattern(42)).toBeNull();
    });

    it('decodifica con las dimensiones correctas', () => {
        const pattern = decodePattern('ffff000000000000');
        expect(pattern).toHaveLength(TRACK_COUNT);
        expect(pattern[0]).toHaveLength(STEP_COUNT);
        expect(pattern[0].every((v) => v === 1)).toBe(true);
        expect(pattern[1].every((v) => v === 0)).toBe(true);
    });

    it('limita el BPM al rango de la mesa', () => {
        expect(clampBpm(95)).toBe(95);
        expect(clampBpm(20)).toBe(70);
        expect(clampBpm(400)).toBe(160);
        expect(clampBpm('no-numérico')).toBe(95);
        expect(clampBpm('120')).toBe(120);
    });
});
