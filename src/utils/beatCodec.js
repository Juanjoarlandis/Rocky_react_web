// Códec del patrón de la Mesa de Beats: 4 pistas × 16 pasos → 16 caracteres hex.
// Cada pista se empaqueta como un entero de 16 bits (bit i = paso i activo).

export const TRACK_COUNT = 4;
export const STEP_COUNT = 16;

export function emptyPattern() {
    return Array.from({ length: TRACK_COUNT }, () => Array(STEP_COUNT).fill(0));
}

export function encodePattern(pattern) {
    return pattern
        .map((track) =>
            track
                .reduce((bits, on, i) => (on ? bits | (1 << i) : bits), 0)
                .toString(16)
                .padStart(4, '0')
        )
        .join('');
}

export function decodePattern(code) {
    if (typeof code !== 'string' || !/^[0-9a-f]{16}$/i.test(code)) {
        return null;
    }
    const pattern = [];
    for (let t = 0; t < TRACK_COUNT; t += 1) {
        const bits = parseInt(code.slice(t * 4, t * 4 + 4), 16);
        pattern.push(
            Array.from({ length: STEP_COUNT }, (_, i) => ((bits >> i) & 1))
        );
    }
    return pattern;
}

export function clampBpm(value, fallback = 95) {
    const bpm = Number(value);
    if (!Number.isFinite(bpm)) return fallback;
    return Math.min(160, Math.max(70, Math.round(bpm)));
}
