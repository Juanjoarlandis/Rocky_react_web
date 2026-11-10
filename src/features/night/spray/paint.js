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

// Dos trazos de la misma firma son la misma pintada si sus cajas (que ya
// llevan el aire del chorro) quedan a menos de esto.
const HUECO_PINTADA = 48;

const cerca = (a, b) =>
  a.minX - HUECO_PINTADA <= b.maxX &&
  b.minX - HUECO_PINTADA <= a.maxX &&
  a.minY - HUECO_PINTADA <= b.maxY &&
  b.minY - HUECO_PINTADA <= a.maxY;

function crecer(pintada, caja) {
  pintada.minX = Math.min(pintada.minX, caja.minX);
  pintada.minY = Math.min(pintada.minY, caja.minY);
  pintada.maxX = Math.max(pintada.maxX, caja.maxX);
  pintada.maxY = Math.max(pintada.maxY, caja.maxY);
}

/* Las pintadas de la pared: los trazos de cada firma, agrupados por
   cercanía. Quien pinta en dos sitios tiene dos pintadas, cada una con su
   caja, el color de su último trazo y el orden en que se tocó por última vez
   (la lista sale en ese orden: la última es la más reciente). */
export function pintadas(strokes, centerX) {
  const porFirma = new Map();
  strokes.forEach((stroke, orden) => {
    if (!stroke.firma) return;
    const suyas = porFirma.get(stroke.firma) ?? [];
    const nueva = { firma: stroke.firma, ...strokeBounds(stroke, centerX), c: stroke.c, orden };
    // El trazo puede tocar varias pintadas suyas y, al crecer, alcanzar otra:
    // se funden hasta que ya no toca ninguna más.
    let resto = suyas;
    for (let creciendo = true; creciendo;) {
      creciendo = false;
      const lejos = [];
      for (const pintada of resto) {
        if (cerca(pintada, nueva)) {
          crecer(nueva, pintada);
          creciendo = true;
        } else lejos.push(pintada);
      }
      resto = lejos;
    }
    resto.push(nueva);
    porFirma.set(stroke.firma, resto);
  });
  return [...porFirma.values()].flat().sort((a, b) => a.orden - b.orden);
}

// Alto de una línea de firma (letra de 15 px y su remate, que baja hasta
// 23 px), ancho aproximado de cada letra, aire mínimo con el borde de la
// página y sitio para el remate que va delante del texto (la estrella):
// bastan para que dos tags no se monten y para que ninguno se salga.
export const TAG_LINE = 26;
const TAG_CHAR = 9;
export const TAG_MARGEN = 8;
const RESERVA_REMATE = 16;
// Topes para que una pared con cientos de pintadas en el mismo sitio no
// cuelgue el navegador al repintar: solo se rotulan las más recientes, y cada
// firma baja como mucho unas líneas (si sigue pisando, se queda ahí).
const MAX_FIRMAS = 150;
const MAX_BAJADAS = 8;

/* Dónde va la firma de cada pintada: debajo de lo pintado, acabando en su
   borde derecho y creciendo hacia dentro, con el color de su último trazo y
   sin salirse de la página. Lista de { firma, x, y, c, ancho } en el orden en
   que se pintaron; `x` es el borde DERECHO del texto. */
export function posicionesDeFirmas(strokes, centerX, anchoPagina = Infinity) {
  const puestas = [];
  return pintadas(strokes, centerX)
    .slice(-MAX_FIRMAS)
    .map(({ firma, maxX, maxY, c }) => {
      const ancho = firma.length * TAG_CHAR;
      const x = Math.max(
        Math.min(maxX - NOZZLE, anchoPagina - TAG_MARGEN),
        TAG_MARGEN + RESERVA_REMATE + ancho
      );
      let y = maxY - NOZZLE;
      // Si caería encima de otra firma ya puesta, baja una línea hasta que
      // cabe: dos pintadas en el mismo sitio no dejan un borrón ilegible.
      const pisa = () =>
        puestas.some(
          (otra) => x - ancho < otra.x && otra.x - otra.ancho < x && Math.abs(otra.y - y) < TAG_LINE
        );
      for (let bajadas = 0; bajadas < MAX_BAJADAS && pisa(); bajadas += 1) y += TAG_LINE;
      puestas.push({ x, y, ancho });
      return { firma, x, y, c, ancho };
    });
}

// La firma de la pintada que cubre un punto (para reportarla señalándola): la
// más reciente si hay varias, o null. El hueco entre dos pintadas de una
// misma firma no es de nadie.
export function firmaEn(strokes, centerX, { x, y }) {
  let encontrada = null;
  for (const pintada of pintadas(strokes, centerX)) {
    if (x >= pintada.minX && x <= pintada.maxX && y >= pintada.minY && y <= pintada.maxY) {
      encontrada = pintada.firma;
    }
  }
  return encontrada;
}

/* La mano de cada firma: una inclinación entre -8° y 8° y un remate de tres
   (subrayado en onda, flecha o estrella), sacados de su texto. Son siempre
   los mismos para la misma firma: es su manera de firmar. */
export function manoDe(firma) {
  let hash = 0;
  for (const char of firma) hash = (hash * 31 + char.codePointAt(0)) | 0;
  const semilla = Math.abs(hash);
  // >>> y no >>: con el hash más negativo posible, >> daría un remate negativo
  return { giro: (((semilla % 17) - 8) * Math.PI) / 180, remate: (semilla >>> 5) % 3 };
}

// Los remates se dibujan con el texto entre x = -ancho y x = 0, debajo de él
// (la estrella, delante: por eso las firmas reservan RESERVA_REMATE a su
// izquierda).
const REMATES = [
  // Subrayado en onda
  (ctx, ancho) => {
    ctx.beginPath();
    ctx.moveTo(-ancho - 2, 19);
    ctx.quadraticCurveTo(-ancho * 0.75, 15, -ancho * 0.5, 19);
    ctx.quadraticCurveTo(-ancho * 0.25, 23, 3, 17);
    ctx.stroke();
  },
  // Flecha que sale por la derecha
  (ctx, ancho) => {
    ctx.beginPath();
    ctx.moveTo(-ancho, 19);
    ctx.lineTo(6, 19);
    ctx.moveTo(1, 15);
    ctx.lineTo(6, 19);
    ctx.lineTo(1, 23);
    ctx.stroke();
  },
  // Estrella delante y una raya corta debajo
  (ctx, ancho) => {
    const cx = -ancho - 9;
    const cy = 8;
    ctx.beginPath();
    for (let punta = 0; punta < 5; punta += 1) {
      const angulo = ((punta * 144 - 90) * Math.PI) / 180;
      const x = cx + Math.cos(angulo) * 5;
      const y = cy + Math.sin(angulo) * 5;
      if (punta === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-ancho * 0.6, 19);
    ctx.lineTo(0, 19);
    ctx.stroke();
  },
];

// La firma, pequeña y con un brillo de su color, como un tag a rotulador:
// inclinada y rematada a su manera. `x` es su borde derecho, que es también
// el punto sobre el que gira.
export function drawTag(ctx, text, x, y, color, font) {
  const { giro, remate } = manoDe(text);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(giro);
  ctx.font = `15px ${font}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'right';
  ctx.globalAlpha = 0.92;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillText(text, 0, 0);
  // El remate se ajusta al ancho de verdad del texto; el estimado solo vale
  // donde no se puede medir.
  const medido = ctx.measureText(text)?.width;
  REMATES[remate](ctx, typeof medido === 'number' && medido > 0 ? medido : text.length * TAG_CHAR);
  ctx.restore();
}

// ---------- Destacar lo de una firma ----------

// Cuánta opacidad pierde lo demás cuando se destaca una firma
const ATENUADO = 0.78;

/* Baja la opacidad de todo lo ya pintado en el lienzo sin borrarlo: después se
   repinta encima lo que se quiere destacar. Así no hace falta un segundo
   lienzo del tamaño de la página. */
export function atenuar(ctx, width, height) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = ATENUADO;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
