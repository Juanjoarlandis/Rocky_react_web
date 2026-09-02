// Códec del patrón de La Mesa de Beats.
//
// v2: 8 pistas × 16 pasos, cada paso con velocidad 0-3
//     (0 apagado, 1 fantasma, 2 normal, 3 acento).
//     Se empaquetan dos pasos por carácter hex → '2' + 64 caracteres.
// v1: los enlaces antiguos (4 pistas encendido/apagado, 16 hex) se siguen
//     leyendo y se abren como golpes normales en las cuatro primeras pistas.

export const TRACK_COUNT = 8;
export const STEP_COUNT = 16;
export const LEGACY_TRACK_COUNT = 4;
export const MAX_VELOCITY = 3;

// Rango de la mesa: lo que admiten los mandos, el tap tempo y los enlaces.
export const BPM_MIN = 60;
export const BPM_MAX = 180;
export const BPM_DEFAULT = 95;
// Swing: 0 = recto, 1 = la corchea impar se va al tresillo (y un poco más)
export const SWING_MIN = 0;
export const SWING_MAX = 0.7;
export const SWING_DEFAULT = 0;

const V2_PREFIX = '2';
const V1_RE = /^[0-9a-f]{16}$/i;
const V2_RE = /^2[0-9a-f]{64}$/i;

export function emptyPattern() {
    return Array.from({ length: TRACK_COUNT }, () => Array(STEP_COUNT).fill(0));
}

function clampVel(value) {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return 0;
    return Math.min(MAX_VELOCITY, Math.round(v));
}

// Deja cualquier patrón con la forma correcta (8×16, velocidades 0-3)
export function normalizePattern(pattern) {
    const base = emptyPattern();
    if (!Array.isArray(pattern)) return base;
    pattern.slice(0, TRACK_COUNT).forEach((track, t) => {
        if (!Array.isArray(track)) return;
        track.slice(0, STEP_COUNT).forEach((value, s) => {
            base[t][s] = clampVel(value);
        });
    });
    return base;
}

export function encodePattern(pattern) {
    const seguro = normalizePattern(pattern);
    const cuerpo = seguro
        .map((track) => {
            let salida = '';
            for (let s = 0; s < STEP_COUNT; s += 2) {
                salida += ((track[s] << 2) | track[s + 1]).toString(16);
            }
            return salida;
        })
        .join('');
    return V2_PREFIX + cuerpo;
}

function decodeLegacy(code) {
    const pattern = emptyPattern();
    for (let t = 0; t < LEGACY_TRACK_COUNT; t += 1) {
        const bits = parseInt(code.slice(t * 4, t * 4 + 4), 16);
        for (let s = 0; s < STEP_COUNT; s += 1) {
            pattern[t][s] = (bits >> s) & 1 ? 2 : 0;
        }
    }
    return pattern;
}

export function decodePattern(code) {
    if (typeof code !== 'string') return null;
    if (V1_RE.test(code)) return decodeLegacy(code.toLowerCase());
    if (!V2_RE.test(code)) return null;

    const cuerpo = code.slice(1).toLowerCase();
    const pattern = emptyPattern();
    for (let t = 0; t < TRACK_COUNT; t += 1) {
        const trozo = cuerpo.slice(t * 8, t * 8 + 8);
        for (let i = 0; i < 8; i += 1) {
            const byte = parseInt(trozo[i], 16);
            pattern[t][i * 2] = (byte >> 2) & 3;
            pattern[t][i * 2 + 1] = byte & 3;
        }
    }
    return pattern;
}

// Patrón escrito a mano en texto: '.' silencio, 'o' fantasma,
// 'x' golpe normal, 'X' acento. Una cadena por pista.
const SIGNOS = { '.': 0, '-': 0, o: 1, x: 2, X: 3 };

export function patternFromRows(rows = {}, trackIds = []) {
    const pattern = emptyPattern();
    trackIds.slice(0, TRACK_COUNT).forEach((id, t) => {
        const fila = rows[id];
        if (typeof fila !== 'string') return;
        for (let s = 0; s < STEP_COUNT; s += 1) {
            pattern[t][s] = SIGNOS[fila[s]] ?? 0;
        }
    });
    return pattern;
}

export function isEmptyPattern(pattern) {
    return normalizePattern(pattern).every((track) => track.every((v) => v === 0));
}

export function clampBpm(value, fallback = BPM_DEFAULT) {
    const bpm = Number(value);
    if (!Number.isFinite(bpm)) return fallback;
    return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
}

// El swing se guarda con dos decimales: es lo que resuelve el mando.
export function clampSwing(value, fallback = SWING_DEFAULT) {
    const swing = Number(value);
    if (!Number.isFinite(swing)) return fallback;
    return Math.min(SWING_MAX, Math.max(SWING_MIN, Math.round(swing * 100) / 100));
}
