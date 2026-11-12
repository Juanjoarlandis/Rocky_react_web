import { describe, expect, it } from 'vitest';
import { ENCUADRE } from '../shared/lacoma.mjs';
import { CONSULTA, aModulo, hornear, simplificar } from './plano-lacoma.mjs';

/* El plano de Lacoma (barrio-en-mapa): de un extracto de OpenStreetMap a los trazos del mapa. */
describe('simplificar', () => {
  it('una recta casi recta se queda en sus dos extremos', () => {
    const recta = [
      [0, 0],
      [1, 0.1],
      [2, 0],
      [3, 0.05],
      [10, 0],
    ];

    expect(simplificar(recta, 1)).toEqual([
      [0, 0],
      [10, 0],
    ]);
  });

  // El prototipo los aplastaba: un anillo empieza y acaba en el mismo punto.
  it('un anillo cerrado conserva sus esquinas', () => {
    const cuadrado = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
      [0, 0],
    ];

    expect(simplificar(cuadrado, 1)).toEqual(cuadrado);
  });

  // Una horquilla que se pasa del extremo está en la recta, pero no en el tramo.
  it('una horquilla que se pasa del extremo no se recorta', () => {
    const horquilla = [
      [0, 0],
      [10, 0],
      [20, 0],
      [15, 0],
    ];

    expect(simplificar(horquilla, 1)).toEqual([
      [0, 0],
      [20, 0],
      [15, 0],
    ]);
  });
});

// Un extracto mínimo, con la forma que devuelve Overpass (`out geom tags`).
const via = (tags, ...puntos) => ({
  type: 'way',
  tags,
  geometry: puntos.map(([lat, lon]) => ({ lat, lon })),
});

// Del dibujo (1000 × 620) a latitud y longitud, para escribir los casos en unidades del dibujo.
const desde = (x, y) => [
  ENCUADRE.norte - (y / 620) * (ENCUADRE.norte - ENCUADRE.sur),
  ENCUADRE.oeste + (x / 1000) * (ENCUADRE.este - ENCUADRE.oeste),
];

describe('hornear, en los bordes del encuadre', () => {
  it('una vía que cruza el dibujo sin ningún vértice dentro se queda', () => {
    const plano = hornear([via({ highway: 'tertiary' }, desde(-300, 300), desde(1300, 310))]);

    expect(plano.anchas).toBe('M-300 300 1300 310');
  });

  it('una vía que no toca el dibujo se va, aunque su caja lo rodee', () => {
    const plano = hornear([
      via({ highway: 'residential' }, desde(-300, -300), desde(1300, -300), desde(1300, 900)),
    ]);

    expect(plano.calles).toBe('');
  });

  // Si la calle sale del dibujo y vuelve a entrar, el rótulo no puede caer en el hueco.
  it('el rótulo va en el tramo seguido más largo que queda dentro', () => {
    const plano = hornear([
      via(
        { highway: 'residential', name: 'Calle Pico Balaitus' },
        desde(100, 300),
        desde(150, 300),
        desde(500, -200),
        desde(600, 300),
        desde(900, 300)
      ),
    ]);

    expect(plano.rotulos).toEqual([{ texto: 'Pico Balaitus', x: 750, y: 300, giro: 0 }]);
  });
});

describe('hornear', () => {
  const extracto = [
    via(
      { highway: 'tertiary', name: 'Calle Valle de Pinares Llanos' },
      [40.4855, -3.728],
      [40.4857, -3.716]
    ),
    via(
      { highway: 'residential', name: 'Calle Pico Balaitus' },
      [40.4865, -3.721],
      [40.4815, -3.7206]
    ),
    via({ highway: 'residential' }, [40.484, -3.725], [40.48401, -3.72499]),
    via({ highway: 'residential' }, [40.6, -3.9], [40.61, -3.91]),
    via(
      { leisure: 'park' },
      [40.485, -3.7185],
      [40.485, -3.716],
      [40.483, -3.716],
      [40.483, -3.7185],
      [40.485, -3.7185]
    ),
    via({ highway: 'footway' }, [40.484, -3.722], [40.483, -3.721]),
    {
      type: 'node',
      lat: 40.4851113,
      lon: -3.7231023,
      tags: { railway: 'station', name: 'Lacoma' },
    },
  ];
  const plano = hornear(extracto);

  it('separa vías anchas, calles y parques', () => {
    expect(plano.anchas).toMatch(/^M\d+ \d+ \d+ \d+$/);
    expect(plano.calles.split('M').filter(Boolean)).toHaveLength(1);
    expect(plano.parques).toMatch(/^M.+Z$/);
  });

  it('deja fuera las calles diminutas, las de fuera del encuadre y los caminos', () => {
    expect(plano.calles).not.toContain('M-');
    expect(`${plano.anchas} ${plano.calles}`.split('M').filter(Boolean)).toHaveLength(2);
  });

  it('pone el metro Lacoma en su punto', () => {
    expect(plano.metro).toEqual([423, 231]);
  });

  it('rotula las calles con su nombre corto, girado como la calle', () => {
    const textos = plano.rotulos.map((rotulo) => rotulo.texto);

    expect(textos).toEqual(expect.arrayContaining(['Valle de Pinares Llanos', 'Pico Balaitus']));
    const balaitus = plano.rotulos.find((rotulo) => rotulo.texto === 'Pico Balaitus');
    expect(Math.abs(balaitus.giro)).toBeGreaterThan(80);
  });
});

describe('aModulo', () => {
  it('escribe un módulo que exporta el plano y cita a OpenStreetMap', async () => {
    const plano = { anchas: 'M0 0 10 0', calles: '', parques: '', metro: [1, 2], rotulos: [] };
    const fuente = aModulo(plano);

    expect(fuente).toContain('© colaboradores de OpenStreetMap');
    const modulo = await import(`data:text/javascript,${encodeURIComponent(fuente)}`);
    expect(modulo.PLANO).toEqual(plano);
  });

  it('la consulta pide calles, parques y el metro en una caja algo mayor que el encuadre', () => {
    expect(CONSULTA).toContain('[bbox:40.4801,-3.7337,40.4901,-3.7125]');
    expect(CONSULTA).toContain('way["leisure"="park"]');
    expect(CONSULTA).toContain('node["railway"="station"]');
  });
});
