/* El trazo del spray, en canvas y sin estado: un sello (núcleo suave con su
   halo y unas motas alrededor) repetido a lo largo del recorrido, y los
   chorretones donde la mano se queda quieta. Todo lo aleatorio sale de una
   semilla por trazo, así que repintar una pintada guardada la deja idéntica
   a como se hizo. */

export const NOZZLE = 13;
const SPACING = 3.5;
const SPECKLES = 4;

// Los colores salen de los tokens de noche; los literales son sólo la red
// para cuando no hay CSS (tests) o la variable llega vacía.
const COLOR_TOKENS = Object.freeze([
  ['--uv-lime', '#d4ff26'],
  ['--uv-violet-soft', '#c4adff'],
  ['--ink', '#edf1ff'],
]);

export const SPRAY_COLOR_NAMES = Object.freeze(['Lima', 'Violeta', 'Blanco UV']);

export function sprayColors() {
  const styles =
    typeof window !== 'undefined' ? window.getComputedStyle(document.documentElement) : null;
  return COLOR_TOKENS.map(
    ([token, fallback]) => styles?.getPropertyValue(token).trim() || fallback
  );
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* El sello pre-pintado: un degradado radial con núcleo denso y halo tenue.
   Se dibuja una vez por color y luego se estampa con drawImage, que es lo
   barato. */
export function makeSprite(color, radius = NOZZLE) {
  const size = Math.ceil(radius * 4) + 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const center = size / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius * 2);
  gradient.addColorStop(0, withAlpha(color, 0.5));
  gradient.addColorStop(0.22, withAlpha(color, 0.38));
  gradient.addColorStop(0.5, withAlpha(color, 0.1));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function withAlpha(hex, alpha) {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function stamp(ctx, x, y, sprite, color, random) {
  if (sprite) ctx.drawImage(sprite, x - sprite.width / 2, y - sprite.height / 2);
  ctx.fillStyle = color;
  for (let index = 0; index < SPECKLES; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = NOZZLE * (0.55 + random() * 1.15);
    const size = 1 + random() * 1.8;
    ctx.globalAlpha = 0.3 + random() * 0.5;
    ctx.fillRect(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, size, size);
  }
  ctx.globalAlpha = 1;
}

/* Del punto (ax, ay) al (bx, by): sellos cada SPACING píxeles. Es la misma
   función en vivo y al repintar, por eso ambas gastan igual la semilla. */
export function spraySegment(ctx, ax, ay, bx, by, sprite, color, random) {
  const distance = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.floor(distance / SPACING));
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    stamp(ctx, ax + (bx - ax) * t, ay + (by - ay) * t, sprite, color, random);
  }
}

export function sprayDot(ctx, x, y, sprite, color, random) {
  stamp(ctx, x, y, sprite, color, random);
}

// El chorretón: un hilo que baja y una gota redonda al final. Mientras crece
// se pinta sólo el hilo; la gota, una vez, cuando llega abajo.
export function drawDrip(ctx, x, y, from, to, color, drop = true) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + from);
  ctx.lineTo(x, y + to);
  ctx.stroke();
  if (!drop) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y + to, 3.3, 0, Math.PI * 2);
  ctx.fill();
}

/* Repinta un trazo guardado. Los puntos van como [dx, y, dx, y…]: dx cuenta
   desde el centro de la ventana, para que la pintada siga pegada al
   contenido (que va centrado) aunque cambie el ancho. */
export function drawStroke(ctx, stroke, centerX, sprites, colors) {
  const points = stroke.p;
  if (!points || points.length < 2) return;
  const color = colors[stroke.c] ?? colors[0];
  const sprite = sprites[stroke.c] ?? sprites[0];
  const random = mulberry32(stroke.s);
  let ax = centerX + points[0];
  let ay = points[1];
  sprayDot(ctx, ax, ay, sprite, color, random);
  for (let index = 2; index < points.length; index += 2) {
    const bx = centerX + points[index];
    const by = points[index + 1];
    spraySegment(ctx, ax, ay, bx, by, sprite, color, random);
    ax = bx;
    ay = by;
  }
  (stroke.d || []).forEach(([dx, dy, length]) => {
    drawDrip(ctx, centerX + dx, dy, 0, length, color);
  });
}

// Caja de un trazo (en coordenadas de página), con el aire del chorro y
// los chorretones: para la foto y para saber qué repintar.
export function strokeBounds(stroke, centerX = 0) {
  const points = stroke.p || [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < points.length; index += 2) {
    minX = Math.min(minX, centerX + points[index]);
    maxX = Math.max(maxX, centerX + points[index]);
    minY = Math.min(minY, points[index + 1]);
    maxY = Math.max(maxY, points[index + 1]);
  }
  (stroke.d || []).forEach(([dx, dy, length]) => {
    minX = Math.min(minX, centerX + dx);
    maxX = Math.max(maxX, centerX + dx);
    maxY = Math.max(maxY, dy + length + 4);
    minY = Math.min(minY, dy);
  });
  const pad = NOZZLE * 2.4;
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

// ---------- La pared compartida: firmas ----------

// Caja de todo lo que ha pintado una firma: la unión de sus trazos.
function cajasPorFirma(strokes, centerX) {
  const cajas = new Map();
  for (const stroke of strokes) {
    if (!stroke.firma) continue;
    const caja = strokeBounds(stroke, centerX);
    const previa = cajas.get(stroke.firma);
    // Se vuelve a meter al final: el orden es el del último trazo de cada
    // firma, así «las más recientes» y «la de encima» son de verdad las últimas.
    cajas.delete(stroke.firma);
    cajas.set(
      stroke.firma,
      previa
        ? {
            minX: Math.min(previa.minX, caja.minX),
            minY: Math.min(previa.minY, caja.minY),
            maxX: Math.max(previa.maxX, caja.maxX),
            maxY: Math.max(previa.maxY, caja.maxY),
            c: stroke.c,
          }
        : { ...caja, c: stroke.c }
    );
  }
  return cajas;
}

// Dónde va cada firma: pegada abajo a la derecha de lo suyo, con el color de
// su último trazo. Map firma → { x, y, c }, en el orden en que pintaron.
// Alto de una línea de firma (letra de 15 px y un poco de aire) y ancho
// aproximado de cada letra: bastan para que dos tags no se monten.
export const TAG_LINE = 18;
const TAG_CHAR = 9;
// Topes para que una pared con cientos de firmas en el mismo sitio no cuelgue
// el navegador al repintar: solo se rotulan las más recientes, y cada una baja
// como mucho unas líneas (si sigue pisando, se queda ahí).
const MAX_FIRMAS = 150;
const MAX_BAJADAS = 8;

export function posicionesDeFirmas(strokes, centerX) {
  const sitios = new Map();
  const puestas = [];
  const cajas = [...cajasPorFirma(strokes, centerX)].slice(-MAX_FIRMAS);
  for (const [firma, caja] of cajas) {
    const x = caja.maxX - NOZZLE;
    const ancho = firma.length * TAG_CHAR;
    let y = caja.maxY - NOZZLE;
    // Si caería encima de otra firma ya puesta, baja una línea hasta que cabe:
    // dos pintadas en el mismo sitio no dejan un borrón ilegible.
    const pisa = () =>
      puestas.some(
        (otra) => x < otra.x + otra.ancho && otra.x < x + ancho && Math.abs(otra.y - y) < TAG_LINE
      );
    for (let bajadas = 0; bajadas < MAX_BAJADAS && pisa(); bajadas += 1) y += TAG_LINE;
    puestas.push({ x, y, ancho });
    sitios.set(firma, { x, y, c: caja.c });
  }
  return sitios;
}

// La firma cuya pintada cubre un punto (para reportarla señalándola); la más
// reciente si hay varias, o null.
export function firmaEn(strokes, centerX, { x, y }) {
  let encontrada = null;
  for (const [firma, caja] of cajasPorFirma(strokes, centerX)) {
    if (x >= caja.minX && x <= caja.maxX && y >= caja.minY && y <= caja.maxY) encontrada = firma;
  }
  return encontrada;
}

// La firma, pequeña y con un brillo de su color, como un tag a rotulador.
export function drawTag(ctx, text, x, y, color, font) {
  ctx.save();
  ctx.font = `15px ${font}`;
  ctx.textBaseline = 'top';
  ctx.globalAlpha = 0.92;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
