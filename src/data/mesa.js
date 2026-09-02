// LA MESA DE BEATS — pistas, presets de fábrica y bancos de pads.
// Los patrones se escriben a mano en texto para poder leerlos de un vistazo:
// '.' silencio · 'o' fantasma · 'x' golpe · 'X' acento.

export const TRACKS = [
  { id: 'bombo', label: 'Bombo', corto: 'BMB', voz: 'bombo', opts: { pitch: 52 } },
  { id: 'caja', label: 'Caja', corto: 'CJA', voz: 'caja', opts: {} },
  {
    id: 'hat',
    label: 'Hi-hat',
    corto: 'HAT',
    voz: 'metal',
    opts: { decay: 0.055, hp: 7800, choke: 'hat' },
  },
  { id: 'diana', label: 'Diana', corto: 'DNA', voz: 'diana', opts: {}, acento: true },
  { id: 'palmas', label: 'Palmas', corto: 'PLM', voz: 'palmas', opts: {} },
  {
    id: 'hatab',
    label: 'Hat abierto',
    corto: 'H-A',
    voz: 'metal',
    opts: { decay: 0.34, hp: 6600, nivelBase: 0.3, choke: 'hat' },
  },
  { id: 'tom', label: 'Tom', corto: 'TOM', voz: 'tom', opts: { pitch: 150 } },
  {
    id: 'sub',
    label: '808',
    corto: '808',
    voz: 'sub',
    opts: { decay: 0.8 },
    usaTonica: true,
    acento: true,
  },
];

export const TRACK_IDS = TRACKS.map((t) => t.id);

// Cuánto pega cada nivel de velocidad
export const VELOCIDADES = [0, 0.42, 0.85, 1.18];

export const PRESETS = [
  {
    id: 'boombap',
    label: 'Boom bap',
    bpm: 92,
    swing: 0.24,
    rows: {
      bombo: 'X.....x...X..x..',
      caja: '....X.......X...',
      hat: 'x.o.x.o.x.o.x.oo',
      hatab: '..........x.....',
      palmas: '................',
      diana: '................',
      tom: '................',
      sub: '................',
    },
  },
  {
    id: 'trap',
    label: 'Trap',
    bpm: 140,
    swing: 0,
    rows: {
      bombo: 'X.....x...X.....',
      caja: '........X.......',
      hat: 'x.x.xxx.x.x.xxxx',
      hatab: '..............x.',
      palmas: '........x.......',
      diana: '................',
      tom: '................',
      sub: 'X.......x...X...',
    },
  },
  {
    id: 'drill',
    label: 'Drill',
    bpm: 142,
    swing: 0.08,
    rows: {
      bombo: 'X....x..X...x...',
      caja: '....X.......X...',
      hat: 'x.xx.x.xx.xx.x.x',
      hatab: '.........x......',
      palmas: '................',
      diana: '................',
      tom: '..............o.',
      sub: 'X.......x.X.....',
    },
  },
  {
    id: 'dembow',
    label: 'Reggaetón',
    bpm: 96,
    swing: 0,
    rows: {
      bombo: 'X.......X.......',
      caja: '...o..o...o..o..',
      hat: 'x.x.x.x.x.x.x.x.',
      hatab: '................',
      palmas: '...X..X...X..X..',
      diana: '................',
      tom: '................',
      sub: 'X.......X.......',
    },
  },
  {
    id: 'funk',
    label: 'Funk',
    bpm: 104,
    swing: 0.16,
    rows: {
      bombo: 'X..x.....x..x...',
      caja: '....X..o..X.x...',
      hat: 'xoxoxoxoxoxoxoxo',
      hatab: '..............x.',
      palmas: '................',
      diana: '................',
      tom: '.............o.o',
      sub: '................',
    },
  },
  {
    id: 'house',
    label: 'House',
    bpm: 124,
    swing: 0,
    rows: {
      bombo: 'X...X...X...X...',
      caja: '................',
      hat: '..x...x...x...x.',
      hatab: '..x...x...x...x.',
      palmas: '....X.......X...',
      diana: '................',
      tom: '................',
      sub: '..x...x...x...x.',
    },
  },
];

// ---------- Pads ----------

export const PAD_TECLAS = [
  '1',
  '2',
  '3',
  '4',
  'q',
  'w',
  'e',
  'r',
  'a',
  's',
  'd',
  'f',
  'z',
  'x',
  'c',
  'v',
];

// Tonalidades disponibles: el 808 y el banco de teclas van a la vez
export const TONALIDADES = [
  { id: 'do', label: 'Do m', midi: 60 },
  { id: 're', label: 'Re m', midi: 62 },
  { id: 'mi', label: 'Mi m', midi: 64 },
  { id: 'fa', label: 'Fa m', midi: 65 },
  { id: 'sol', label: 'Sol m', midi: 67 },
  { id: 'la', label: 'La m', midi: 69 },
];

const NOMBRES_NOTA = [
  'Do',
  'Do♯',
  'Re',
  'Mi♭',
  'Mi',
  'Fa',
  'Fa♯',
  'Sol',
  'Sol♯',
  'La',
  'Si♭',
  'Si',
];

export function nombreNota(midi) {
  return NOMBRES_NOTA[((midi % 12) + 12) % 12];
}

// Escala menor natural, dos octavas: dan justo los 16 pads
const ESCALA = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24, 26];

const BANCO_KIT = [
  { id: 'bombo', label: 'Bombo', voz: 'bombo', opts: { pitch: 52 }, track: 'bombo', tipo: 'grave' },
  {
    id: 'bombo-largo',
    label: 'Bombo largo',
    voz: 'bombo',
    opts: { pitch: 44, decay: 0.75, drive: 0.45 },
    track: 'bombo',
    tipo: 'grave',
  },
  { id: 'caja', label: 'Caja', voz: 'caja', opts: {}, track: 'caja', tipo: 'medio' },
  { id: 'rim', label: 'Rim', voz: 'rim', opts: {}, tipo: 'medio' },
  { id: 'palmas', label: 'Palmas', voz: 'palmas', opts: {}, track: 'palmas', tipo: 'medio' },
  {
    id: 'hat',
    label: 'Hat',
    voz: 'metal',
    opts: { decay: 0.055, hp: 7800, choke: 'hat' },
    track: 'hat',
    tipo: 'agudo',
  },
  {
    id: 'hatab',
    label: 'Hat abierto',
    voz: 'metal',
    opts: { decay: 0.34, hp: 6600, nivelBase: 0.3, choke: 'hat' },
    track: 'hatab',
    tipo: 'agudo',
  },
  { id: 'shaker', label: 'Shaker', voz: 'shaker', opts: {}, tipo: 'agudo' },
  {
    id: 'tom-grave',
    label: 'Tom grave',
    voz: 'tom',
    opts: { pitch: 108, decay: 0.42 },
    track: 'tom',
    tipo: 'medio',
  },
  {
    id: 'tom-agudo',
    label: 'Tom agudo',
    voz: 'tom',
    opts: { pitch: 215 },
    track: 'tom',
    tipo: 'medio',
  },
  { id: 'diana', label: 'Diana', voz: 'diana', opts: {}, track: 'diana', tipo: 'agudo' },
  {
    id: 'crash',
    label: 'Crash',
    voz: 'metal',
    opts: { decay: 1.5, hp: 3800, color: 6000, base: 58, nivelBase: 0.22, send: 0.3 },
    tipo: 'agudo',
  },
  {
    id: 'sub',
    label: '808',
    voz: 'sub',
    opts: { decay: 1 },
    track: 'sub',
    tonica: -24,
    tipo: 'grave',
  },
  { id: 'sub-slide', label: '808 caída', voz: 'caida', opts: {}, tonica: -24, tipo: 'grave' },
  {
    id: 'redoble-caja',
    label: 'Redoble',
    voz: 'caja',
    opts: {},
    redoble: { veces: 8, pulsos: 1 },
    tipo: 'medio',
  },
  {
    id: 'redoble-hat',
    label: 'Hat roll',
    voz: 'metal',
    opts: { decay: 0.05, hp: 7800 },
    redoble: { veces: 12, pulsos: 1 },
    tipo: 'agudo',
  },
];

const BANCO_FX = [
  { id: 'riser', label: 'Riser', voz: 'barrido', opts: { dur: 1.6 }, tipo: 'aire' },
  {
    id: 'bajada',
    label: 'Bajada',
    voz: 'barrido',
    opts: { desde: 7200, hasta: 320, dur: 0.9 },
    tipo: 'aire',
  },
  { id: 'impacto', label: 'Impacto', voz: 'impacto', opts: {}, tipo: 'grave' },
  { id: 'reversa', label: 'Reversa', voz: 'reversa', opts: {}, tipo: 'aire' },
  { id: 'scratch', label: 'Scratch', voz: 'scratch', opts: {}, tipo: 'medio' },
  { id: 'scratch-largo', label: 'Scratch ×2', voz: 'scratch', opts: { dur: 0.62 }, tipo: 'medio' },
  { id: 'sirena', label: 'Sirena', voz: 'sirena', opts: {}, tipo: 'aire' },
  { id: 'bocina', label: 'Bocina', voz: 'bocina', opts: {}, tipo: 'medio' },
  { id: 'laser', label: 'Láser', voz: 'laser', opts: {}, tipo: 'agudo' },
  {
    id: 'zap',
    label: 'Zap',
    voz: 'laser',
    opts: { desde: 2600, hasta: 420, dur: 0.16, tipo: 'square' },
    tipo: 'agudo',
  },
  { id: 'caida', label: 'Caída 808', voz: 'caida', opts: {}, tonica: -24, tipo: 'grave' },
  { id: 'acorde-m', label: 'Acorde m', voz: 'acorde', opts: {}, tonica: -12, tipo: 'aire' },
  {
    id: 'acorde-M',
    label: 'Acorde M',
    voz: 'acorde',
    opts: { grados: [0, 4, 7] },
    tonica: -12,
    tipo: 'aire',
  },
  {
    id: 'sub-largo',
    label: 'Sub largo',
    voz: 'sub',
    opts: { decay: 1.6 },
    tonica: -24,
    tipo: 'grave',
  },
  { id: 'subidon', label: 'Subidón', voz: 'reversa', opts: { dur: 1.9 }, tipo: 'aire' },
  {
    id: 'cinta',
    label: 'Freno cinta',
    voz: 'laser',
    opts: { desde: 700, hasta: 60, dur: 0.7, tipo: 'triangle' },
    tipo: 'grave',
  },
];

function bancoTeclas(raizMidi) {
  return ESCALA.map((semis, i) => {
    const midi = raizMidi - 12 + semis;
    return {
      id: `tecla-${i}`,
      label: `${nombreNota(midi)}${Math.floor(midi / 12) - 1}`,
      voz: 'tecla',
      opts: { midi, decay: 1.4 },
      tipo: 'tecla',
    };
  });
}

export const BANCOS = [
  { id: 'kit', label: 'Batería' },
  { id: 'teclas', label: 'Teclas' },
  { id: 'fx', label: 'Efectos' },
];

// Los pads del banco activo, ya resueltos con la tonalidad elegida
export function padsDelBanco(bancoId, raizMidi) {
  if (bancoId === 'teclas') return bancoTeclas(raizMidi);
  const lista = bancoId === 'fx' ? BANCO_FX : BANCO_KIT;
  return lista.map((pad) =>
    pad.tonica === undefined ? pad : { ...pad, opts: { ...pad.opts, midi: raizMidi + pad.tonica } }
  );
}
