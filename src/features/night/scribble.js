/* El garabato con el que se tapa la pantalla al cambiar de modo: rotulador
   negro al entrar en la noche y corrector al salir (idea 5 de dirección
   artística). Son pasadas de ida y vuelta, en diagonal y algo combadas, como
   quien tapa una hoja a rotulador. Se calcula para la pantalla que hay, porque
   un dibujo fijo estirado deja bandas rectas en un móvil vertical.

   Geometría (comprobada en scribble.test.js para móviles, tablets,
   portátiles y ultrapanorámicos):
   - cada pasada baja `DROP` × la separación entre pasadas y se comba `BOW`;
   - entre dos pasadas seguidas hay como mucho (1 + DROP) separaciones, y el
     grosor es `WIDTH` separaciones, así que nunca queda una franja sin tinta;
   - los giros caen fuera de la pantalla a más de medio grosor. */

// Separación entre pasadas: 150 px en pantallas grandes; en pantallas pequeñas,
// la que deja el grosor (WIDTH × separación) en el 40 % del lado corto como
// mucho, para que el trazo sea de rotulador y no un telón.
const PASS_HEIGHT = 150;
const MAX_STROKE_SHARE = 0.4;
const MIN_PASSES = 5;
const DROP = 0.6;
const BOW = 0.18;
const WIDTH = 1.8;
const START = -0.35;

const size = (value) => (Number.isFinite(value) && value > 0 ? value : 1);
const round = (value) => Math.round(value * 10) / 10;

export function scribblePasses(rawWidth, rawHeight) {
  const width = size(rawWidth);
  const height = size(rawHeight);
  const passHeight = Math.min(PASS_HEIGHT, (Math.min(width, height) * MAX_STROKE_SHARE) / WIDTH);
  const count = Math.max(MIN_PASSES, Math.ceil(height / passHeight) + 1);
  const step = height / (count - 1);
  const strokeWidth = step * WIDTH;
  const left = -strokeWidth;
  const right = width + strokeWidth;
  const passes = [];
  for (let i = 0; i < count; i += 1) {
    const y = (START + i) * step;
    const forward = i % 2 === 0;
    const bow = (forward ? -1 : 1) * step * BOW;
    passes.push({
      from: [forward ? left : right, y],
      control: [width / 2, y + (step * DROP) / 2 + bow],
      to: [forward ? right : left, y + step * DROP],
    });
  }
  return { strokeWidth, passes };
}

export function scribblePath(rawWidth, rawHeight) {
  const width = size(rawWidth);
  const height = size(rawHeight);
  const { strokeWidth, passes } = scribblePasses(width, height);
  const point = ([x, y]) => `${round(x)} ${round(y)}`;
  const d = passes
    .map(
      ({ from, control, to }, i) =>
        `${i === 0 ? 'M' : 'L'}${point(from)} Q${point(control)} ${point(to)}`
    )
    .join(' ');
  return { d, strokeWidth: round(strokeWidth), width, height };
}
