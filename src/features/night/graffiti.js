/* Las pintadas de tinta invisible que la crew malvada deja por la web de
   noche. Cada página tiene las suyas: salen de una semilla con su ruta, así
   que no cambian al recargar ni al crecer la página (cada pintada gasta
   siempre los mismos números, y las nuevas sólo se añaden por abajo).

   Viven en los márgenes de la pared, entre el canto de la ventana y el
   contenido. Lo que no cabe en horizontal sube en vertical por el canto,
   como el katakana del footer, para no quedar detrás de los textos. */

const PINTAS = Object.freeze([
  'DESCONTROL',
  '035',
  'NO MIRES ATRÁS',
  'BZZZZZ',
  'SAL DE AQUÍ',
  '¿QUIÉN APAGÓ LA LUZ?',
  'TE ESTAMOS VIENDO',
  'LA CREW SE HA TORCIDO',
  'ROCKY NO DUERME',
]);

const NOTAS = Object.freeze([
  'El Tachón estuvo aquí',
  'sigue bajando…',
  'no enciendas la luz',
  'el Mirón te ha visto',
  'aquí no hay nada. o sí.',
  'vuelve de día',
  'la colmena no duerme',
  'mira detrás del banco',
  'el Portero sabe tu nombre',
  'Los del Banco no se mueven',
]);

// Hash FNV-1a y mulberry32: pocos bytes y la misma serie en cualquier navegador.
function seedFrom(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Baraja Fisher-Yates: cada página reparte las frases en su orden y no repite
// una hasta haber gastado todas.
function shuffled(list, random) {
  const deck = [...list];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  return deck;
}

const MAX_TAGS = 48;
const REM = 16;
// El contenido llega hasta 1200 px con 24 de aire; en móvil, 16 de aire.
const CONTENT_WIDTH = 1200;
const SIZES = Object.freeze({
  pinta: [2, 3.1],
  nota: [1.1, 1.5],
  diana: [2.2, 3.4],
  cuenta: [1.5, 2.1],
});

// Ancho aproximado en horizontal, en píxeles, para saber si cabe en el margen.
function horizontalWidth(kind, text, px) {
  if (kind === 'diana') return px * 1.5;
  if (kind === 'cuenta') return px * 2.8;
  return text.length * px * (kind === 'pinta' ? 0.6 : 0.46);
}

export function wallMargin(viewportWidth) {
  if (viewportWidth <= 640) return 16;
  return Math.max(24, (viewportWidth - CONTENT_WIDTH) / 2 + 24);
}

export function graffitiFor(pathname, pageHeight, viewportWidth) {
  const random = mulberry32(seedFrom(pathname || '/'));
  const decks = { pinta: shuffled(PINTAS, random), nota: shuffled(NOTAS, random) };
  const dealt = { pinta: 0, nota: 0 };
  const narrow = viewportWidth < 900;
  const scale = narrow ? 0.72 : 1;
  const room = wallMargin(viewportWidth) - 6;
  const step = narrow ? 460 : 380;
  const tags = [];
  let y = 150 + random() * 140;

  for (let index = 0; y < pageHeight - 90 && index < MAX_TAGS; index += 1) {
    // Siempre cinco números por pintada, pase lo que pase: así la serie de
    // las de arriba no depende de cuánto mida la página.
    const kindRoll = random();
    const xRoll = random();
    const rotRoll = random();
    const sizeRoll = random();
    const gapRoll = random();

    const kind =
      kindRoll < 0.42 ? 'pinta' : kindRoll < 0.78 ? 'nota' : kindRoll < 0.9 ? 'diana' : 'cuenta';
    let text = '';
    if (kind === 'pinta' || kind === 'nota') {
      text = decks[kind][dealt[kind] % decks[kind].length];
      dealt[kind] += 1;
    } else if (kind === 'cuenta') {
      text = 'IIII';
    }

    const [min, max] = SIZES[kind];
    const size = Math.round((min + sizeRoll * (max - min)) * scale * 100) / 100;
    const px = size * REM;
    const wide = horizontalWidth(kind, text, px);
    const vertical = (kind === 'pinta' || kind === 'nota') && wide > room;
    const thickness = vertical ? px * 1.15 : wide;
    const free = Math.max(0, room - thickness);

    tags.push({
      id: `${index}`,
      kind,
      text,
      side: index % 2 === 0 ? 'left' : 'right',
      vertical,
      x: Math.round(6 + xRoll * free),
      y: Math.round(y),
      rot: Math.round((rotRoll * 2 - 1) * (vertical ? 3 : 12)),
      size,
    });
    y += step * (0.75 + gapRoll * 0.5);
  }
  return tags;
}
