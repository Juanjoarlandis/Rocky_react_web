import logoUrl from '../../../images/Rockypng.png';
import { drawStroke, makeSprite, sprayColors, strokeBounds } from './paint.js';

/* La foto de la pintada, lista para Instagram (1080 × 1350, el vertical del
   feed): la pared de noche, la pintada encajada en el centro con su brillo y
   la firma de la casa. Todo en canvas y con recursos propios, así que no
   ensucia el lienzo y se puede exportar. */

const WIDTH = 1080;
const HEIGHT = 1350;
const ART = Object.freeze({ x: 70, y: 170, width: 940, height: 820 });

function token(name, fallback) {
  return (
    window.getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts?.load('52px "Luckiest Guy"'),
      document.fonts?.load('32px "Fredoka"'),
    ]);
  } catch {
    // Sin las fuentes de la casa, el canvas tira de las de reserva.
  }
}

// El logo es tinta negra sobre transparente: se tiñe del color pedido.
function tinted(image, color) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export function paintBounds(strokes) {
  return strokes.reduce(
    (box, stroke) => {
      const b = strokeBounds(stroke, 0);
      return {
        minX: Math.min(box.minX, b.minX),
        minY: Math.min(box.minY, b.minY),
        maxX: Math.max(box.maxX, b.maxX),
        maxY: Math.max(box.maxY, b.maxY),
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );
}

export async function composeShareImage(strokes, now = new Date()) {
  if (!strokes.length) return null;
  await fontsReady();
  const logo = await loadImage(logoUrl).catch(() => null);

  const colors = sprayColors();
  const lime = colors[0];
  const violet = colors[1];
  const paper = token('--paper', '#0c0917');
  const ink = token('--ink', '#edf1ff');

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  // La pared: asfalto de noche, la retícula del cuaderno en violeta y un
  // resplandor ultravioleta detrás de la pintada.
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(157, 114, 255, 0.16)';
  for (let y = 14; y < HEIGHT; y += 27) {
    for (let x = 14; x < WIDTH; x += 27) ctx.fillRect(x, y, 2, 2);
  }
  const glow = ctx.createRadialGradient(540, 580, 40, 540, 580, 560);
  glow.addColorStop(0, 'rgba(157, 114, 255, 0.24)');
  glow.addColorStop(1, 'rgba(157, 114, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // La pintada, encajada en su hueco y centrada, en una capa aparte para
  // darle el brillo de una sola pasada.
  const box = paintBounds(strokes);
  const boxWidth = Math.max(1, box.maxX - box.minX);
  const boxHeight = Math.max(1, box.maxY - box.minY);
  const scale = Math.min(ART.width / boxWidth, ART.height / boxHeight, 3);
  const offsetX = ART.x + (ART.width - boxWidth * scale) / 2;
  const offsetY = ART.y + (ART.height - boxHeight * scale) / 2;
  const paint = document.createElement('canvas');
  paint.width = WIDTH;
  paint.height = HEIGHT;
  const paintCtx = paint.getContext('2d');
  paintCtx.setTransform(scale, 0, 0, scale, offsetX - box.minX * scale, offsetY - box.minY * scale);
  const sprites = colors.map((color) => makeSprite(color));
  strokes.forEach((stroke) => drawStroke(paintCtx, stroke, 0, sprites, colors));
  ctx.save();
  ctx.shadowColor = 'rgba(212, 255, 38, 0.45)';
  ctx.shadowBlur = 26;
  ctx.drawImage(paint, 0, 0);
  ctx.restore();

  // La firma.
  ctx.save();
  ctx.translate(70, 112);
  ctx.rotate((-4 * Math.PI) / 180);
  ctx.fillStyle = lime;
  ctx.shadowColor = lime;
  ctx.shadowBlur = 18;
  ctx.font = '52px "Luckiest Guy", "Arial Black", sans-serif';
  ctx.fillText('MODO DESCONTROL', 0, 0);
  ctx.restore();

  const date = now.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  ctx.fillStyle = violet;
  ctx.font = '30px "Fredoka", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(date.replaceAll('/', '·'), 1010, 100);

  ctx.textAlign = 'center';
  ctx.fillText('PINTADO EN LA PARED DE', 540, 1112);
  if (logo) {
    const logoWidth = 470;
    const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
    ctx.save();
    ctx.shadowColor = lime;
    ctx.shadowBlur = 16;
    ctx.drawImage(tinted(logo, lime), 540 - logoWidth / 2, 1140, logoWidth, logoHeight);
    ctx.restore();
  }
  ctx.fillStyle = ink;
  ctx.fillText('rocky035.com · @rocky035', 540, 1300);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/* En el móvil se abre el menú de compartir del sistema (Instagram incluido);
   donde no se puede compartir un archivo, se descarga. */
export async function shareOrDownload(blob) {
  const file = new File([blob], 'rocky035-descontrol.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'ROCKY 035',
        text: 'Mi pintada en la pared de rocky035.com · @rocky035',
      });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}
