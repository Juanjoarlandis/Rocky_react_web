/* Cada ilustración de la crew (los -hd de día y los -800 de noche) existe
   además a 320 y 640 px de alto (`npm run images:optimize -- --heights
   320,640`). Aquí se elige la que toca según el alto en píxeles CSS al que se
   pinta: la menor que la deja nítida, para no decodificar un original de
   1.500 px en un hueco de 80. */

const files = import.meta.glob(
  [
    '../images/optimized/characters/*-hd.webp',
    '../images/optimized/characters/*-h{320,640}.webp',
    '../images/optimized/night/*-800.webp',
    '../images/optimized/night/*-h{320,640}.webp',
  ],
  { eager: true, import: 'default' }
);

// URL del original → [{ height, url }], de menor a mayor, con el original al final.
const VARIANTS = new Map();
for (const [file, url] of Object.entries(files)) {
  const match = /^(.*)-(?:hd|800)\.webp$/.exec(file);
  if (!match) continue;
  VARIANTS.set(url, [
    { height: 320, url: files[`${match[1]}-h320.webp`] },
    { height: 640, url: files[`${match[1]}-h640.webp`] },
    { height: Infinity, url },
  ]);
}

const smallestFor = (variants, pixels) => variants.find(({ height }) => height >= pixels).url;

/* Atributos para el <img>: { src } o { src, srcSet } con una variante para
   pantallas de densidad 1 y otra para las de densidad 2. `cssHeight` es el
   alto máximo al que se pinta. Lo que no tiene variantes se devuelve tal cual. */
export function artSources(src, cssHeight) {
  const variants = VARIANTS.get(src);
  if (!variants) return { src };
  const single = smallestFor(variants, cssHeight);
  const double = smallestFor(variants, cssHeight * 2);
  return single === double
    ? { src: single }
    : { src: single, srcSet: `${single} 1x, ${double} 2x` };
}
