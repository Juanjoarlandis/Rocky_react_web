// El plano de Lacoma para el mapa del barrio (barrio-en-mapa): convierte un extracto de
// OpenStreetMap en los trazos de src/features/mapa/plano.js, que la web pinta sin pedir nada
// a ningún servicio de mapas. No corre en el build: se ejecuta a mano si cambia el encuadre
// (shared/lacoma.mjs) y su salida va al repositorio.
//
//   node scripts/plano-lacoma.mjs --consulta > consulta.overpassql
//   curl -s --data-urlencode data@consulta.overpassql https://overpass-api.de/api/interpreter > extracto.json
//   node scripts/plano-lacoma.mjs extracto.json
//
// Los datos son © colaboradores de OpenStreetMap, con licencia ODbL: el mapa lo cita.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALTO, ANCHO, proyectar } from '../shared/lacoma.mjs';

// Una caja algo mayor que el encuadre, para que las calles que lo cruzan no se corten antes.
export const CONSULTA = `[out:json][timeout:90][bbox:40.4801,-3.7337,40.4901,-3.7125];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|motorway_link|trunk_link)$"];
  way["leisure"="park"];
  node["railway"="station"];
);
out geom tags;
`;

const ANCHAS = new Set([
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'motorway_link',
  'trunk_link',
]);
const CALLES = new Set(['residential', 'living_street', 'unclassified']);

// Las calles que llevan rótulo a mano, con su nombre corto.
const ROTULOS = new Map([
  ['Calle Valle de Pinares Llanos', 'Valle de Pinares Llanos'],
  ['Calle de Ramón Gómez de la Serna', 'Ramón Gómez de la Serna'],
  ['Calle Pico Balaitus', 'Pico Balaitus'],
  ['Avenida del Cardenal Herrera Oria', 'Herrera Oria'],
]);

// Unidades del dibujo (1000 × 620).
const TOLERANCIA = 1.2;
const TOLERANCIA_PARQUES = 1.5;
const CALLE_MINIMA = 12;
const PARQUE_MINIMO = 900;
const MARGEN = 40;
const ROTULO_MINIMO = 90;

const distancia = ([x1, y1], [x2, y2]) => Math.hypot(x2 - x1, y2 - y1);
const largoDe = (puntos) =>
  puntos.slice(1).reduce((suma, p, i) => suma + distancia(puntos[i], p), 0);

/* La distancia de un punto al tramo a–b (no a la recta entera: una horquilla que se pasa del
   extremo está en la recta, pero no en el tramo). Si a y b coinciden, como en un anillo cerrado,
   es la distancia a ese punto. */
function distanciaAlTramo(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const largo2 = dx * dx + dy * dy;
  if (largo2 < 1e-12) return distancia(p, a);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / largo2));
  return distancia(p, [a[0] + t * dx, a[1] + t * dy]);
}

/* Douglas-Peucker, con la distancia al tramo. */
export function simplificar(puntos, tolerancia) {
  if (puntos.length < 3) return puntos;
  const a = puntos[0];
  const b = puntos.at(-1);
  let peor = 0;
  let indice = 0;
  for (let i = 1; i < puntos.length - 1; i += 1) {
    const d = distanciaAlTramo(puntos[i], a, b);
    if (d > peor) {
      peor = d;
      indice = i;
    }
  }
  if (peor <= tolerancia) return [a, b];
  return [
    ...simplificar(puntos.slice(0, indice + 1), tolerancia).slice(0, -1),
    ...simplificar(puntos.slice(indice), tolerancia),
  ];
}

const aPunto = ({ lat, lon }) => {
  const { x, y } = proyectar(lat, lon);
  return [x, y];
};

/* ¿El tramo p0–p1 pisa el dibujo (con su margen)? Liang-Barsky: una vía puede cruzarlo sin tener
   ningún vértice dentro. */
function tramoTocaElDibujo([x0, y0], [x1, y1]) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [
    [-dx, x0 + MARGEN],
    [dx, ANCHO + MARGEN - x0],
    [-dy, y0 + MARGEN],
    [dy, ALTO + MARGEN - y0],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
    } else if (p < 0) {
      if (q / p > t1) return false;
      t0 = Math.max(t0, q / p);
    } else {
      if (q / p < t0) return false;
      t1 = Math.min(t1, q / p);
    }
  }
  return true;
}

const tocaElDibujo = (puntos) =>
  puntos.length === 1
    ? tramoTocaElDibujo(puntos[0], puntos[0])
    : puntos.slice(1).some((p, i) => tramoTocaElDibujo(puntos[i], p));

// Lo que queda bien dentro del dibujo, donde un rótulo se lee entero.
const bienDentro = ([x, y]) => x > 30 && x < ANCHO - 30 && y > 30 && y < ALTO - 30;

/* El tramo seguido más largo que queda bien dentro: si la calle sale del dibujo y vuelve a
   entrar, el rótulo no puede caer en el hueco. */
function rachaMasLarga(puntos) {
  let mejor = [];
  let actual = [];
  for (const punto of puntos) {
    if (!bienDentro(punto)) {
      actual = [];
      continue;
    }
    actual.push(punto);
    if (largoDe(actual) > largoDe(mejor)) mejor = [...actual];
  }
  return mejor;
}

const trazo = (puntos, cerrar = false) =>
  `M${puntos.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join(' ')}${cerrar ? 'Z' : ''}`;

// La caja que envuelve el polígono: basta para descartar los parques diminutos.
const cajaDe = (puntos) => {
  const xs = puntos.map(([x]) => x);
  const ys = puntos.map(([, y]) => y);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
};

/* El rótulo va a mitad del tramo, girado como la calle y nunca boca abajo. */
function rotular(texto, puntos) {
  const mitad = largoDe(puntos) / 2;
  let recorrido = 0;
  for (let i = 1; i < puntos.length; i += 1) {
    const tramo = distancia(puntos[i - 1], puntos[i]);
    if (recorrido + tramo >= mitad) {
      const t = tramo ? (mitad - recorrido) / tramo : 0;
      const [x1, y1] = puntos[i - 1];
      const [x2, y2] = puntos[i];
      let giro = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      if (giro > 90) giro -= 180;
      if (giro < -90) giro += 180;
      return {
        texto,
        x: Math.round(x1 + (x2 - x1) * t),
        y: Math.round(y1 + (y2 - y1) * t),
        giro: Math.round(giro) || 0,
      };
    }
    recorrido += tramo;
  }
  return null;
}

/* Del extracto de Overpass (`elements`) a las capas del mapa. */
export function hornear(elementos) {
  const anchas = [];
  const calles = [];
  const parques = [];
  const tramos = new Map();
  let metro = null;

  for (const elemento of elementos) {
    const tags = elemento.tags ?? {};
    if (elemento.type === 'node') {
      if (tags.railway === 'station' && tags.name === 'Lacoma') {
        metro = aPunto(elemento).map(Math.round);
      }
      continue;
    }
    if (!elemento.geometry?.length) continue;
    const puntos = elemento.geometry.map(aPunto);
    if (!tocaElDibujo(puntos)) continue;

    if (ANCHAS.has(tags.highway)) {
      anchas.push(trazo(simplificar(puntos, TOLERANCIA)));
    } else if (CALLES.has(tags.highway) && largoDe(puntos) >= CALLE_MINIMA) {
      calles.push(trazo(simplificar(puntos, TOLERANCIA)));
    } else if (tags.leisure === 'park' && cajaDe(puntos) >= PARQUE_MINIMO) {
      parques.push(trazo(simplificar(puntos, TOLERANCIA_PARQUES), true));
    }

    // El tramo seguido más largo de cada calle rotulada, de todas sus vías.
    if (ROTULOS.has(tags.name)) {
      const dentro = rachaMasLarga(puntos);
      const largo = dentro.length > 1 ? largoDe(dentro) : 0;
      if (largo > (tramos.get(tags.name)?.largo ?? 0)) tramos.set(tags.name, { largo, dentro });
    }
  }

  const rotulos = [...tramos]
    .filter(([, { largo }]) => largo >= ROTULO_MINIMO)
    .map(([nombre, { dentro }]) => rotular(ROTULOS.get(nombre), dentro))
    .filter(Boolean);

  return {
    anchas: anchas.join(' '),
    calles: calles.join(' '),
    parques: parques.join(' '),
    metro,
    rotulos,
  };
}

/* El módulo que importa la web. */
export function aModulo(plano, { fecha } = {}) {
  const cuando = fecha ? ` del ${fecha}` : '';
  return `/* GENERADO por scripts/plano-lacoma.mjs; no se edita a mano. El trazado de Lacoma para el
   mapa del barrio (barrio-en-mapa), desde un extracto de OpenStreetMap${cuando}.
   Datos © colaboradores de OpenStreetMap, con licencia ODbL. */
export const PLANO = Object.freeze(${JSON.stringify(plano, null, 2)});
`;
}

const esPrincipal = () =>
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (esPrincipal()) {
  const [, , argumento] = process.argv;
  if (argumento === '--consulta') {
    process.stdout.write(CONSULTA);
  } else if (!argumento) {
    console.error('Uso: node scripts/plano-lacoma.mjs <extracto.json> (o --consulta)');
    process.exit(1);
  } else {
    const extracto = JSON.parse(await readFile(argumento, 'utf8'));
    const plano = hornear(extracto.elements ?? []);
    if (!plano.metro) {
      console.error('El extracto no trae la estación de Lacoma: ¿es la consulta de --consulta?');
      process.exit(1);
    }
    const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const salida = path.join(raiz, 'src/features/mapa/plano.js');
    await writeFile(salida, aModulo(plano, { fecha: extracto.osm3s?.timestamp_osm_base }));
    console.log(
      `plano.js: ${plano.anchas.split('M').length - 1} vías anchas, ` +
        `${plano.calles.split('M').length - 1} calles, ${plano.parques.split('M').length - 1} parques, ` +
        `${plano.rotulos.length} rótulos`
    );
  }
}
