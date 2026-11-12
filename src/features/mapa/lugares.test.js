import { describe, expect, it } from 'vitest';
import { APP_ROUTES } from '../../../shared/routes.mjs';
import { ALTO, ANCHO } from '../../../shared/lacoma.mjs';
import { CREW } from '../../data/crew.js';
import { VOCES } from '../../data/voces.js';
import { FUERA_DEL_MAPA, LUGARES, lugarDe, puntoDe, resumen, vecinosDe } from './lugares.js';

/* Lacoma en un mapa (barrio-en-mapa): los cuatro sitios del barrio que dio el usuario, cada uno
   en su punto real; quién vive en cada uno sale del «visto en» de su cromo. */
const RUTAS = new Set(APP_ROUTES.map((route) => route.path));

describe('los sitios de Lacoma', () => {
  it('son los cuatro del usuario y cada uno abre una sección que existe', () => {
    expect(LUGARES.map((lugar) => [lugar.nombre, lugar.to])).toEqual([
      ['Los bancos de La Salle', '/'],
      ['Bar Mundus', '/rockyIA'],
      ['El callejón', '/menudrop'],
      ['El kebab', '/cart'],
    ]);
    for (const lugar of LUGARES) expect(RUTAS.has(lugar.to)).toBe(true);
  });

  it('cada uno dice qué sección abre', () => {
    expect(LUGARES.map((lugar) => lugar.seccion)).toEqual([
      'La Tienda',
      'Rocky IA',
      'Los Drops',
      'El carrito',
    ]);
  });

  it('cada punto cae dentro del dibujo, donde está de verdad', () => {
    const puntos = Object.fromEntries(
      LUGARES.map((lugar) => {
        const { x, y } = puntoDe(lugar);
        return [lugar.id, [Math.round(x), Math.round(y)]];
      })
    );

    expect(puntos).toEqual({
      bancos: [869, 320],
      mundus: [613, 247],
      callejon: [606, 348],
      kebab: [130, 373],
    });
    for (const [x, y] of Object.values(puntos)) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(ANCHO);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(ALTO);
    }
  });

  it('la cabeza de cada sitio es de uno de sus vecinos', () => {
    const vecinos = vecinosDe(CREW);

    for (const lugar of LUGARES) {
      expect(VOCES[lugar.cabeza]).toBeDefined();
      expect(vecinos.get(lugar.id)).toContain(lugar.cabeza);
    }
  });
});

describe('quién vive en cada sitio', () => {
  const vecinos = vecinosDe(CREW);

  it('Los bancos de La Salle: «Los Fundadores, El Spray y 7 más»', () => {
    expect(resumen(vecinos.get('bancos'))).toBe('Los Fundadores, El Spray y 7 más');
  });

  it('Bar Mundus: «El Portero y El Estrella»', () => {
    expect(resumen(vecinos.get('mundus'))).toBe('El Portero y El Estrella');
  });

  it('El callejón: «El Tumbao, El Ollie y El Dado»', () => {
    expect(resumen(vecinos.get('callejon'))).toBe('El Tumbao, El Ollie y El Dado');
  });

  it('El kebab: «El Curioso, El Dormilón y 2 más»', () => {
    expect(resumen(vecinos.get('kebab'))).toBe('El Curioso, El Dormilón y 2 más');
  });

  it('las fichas y las categorías cuentan donde se abre la tienda', () => {
    expect(vecinos.get('bancos')).toEqual(
      expect.arrayContaining(['El Vigía', 'El Nube', 'El Recadero'])
    );
    expect(lugarDe('/product/rockyracing')).toBe('bancos');
    expect(lugarDe('/products/agotado')).toBe('bancos');
  });

  it('los del 404 viven fuera del mapa', () => {
    expect(vecinos.get(FUERA_DEL_MAPA)).toEqual(['El Turista', 'Rocky']);
  });

  // Solo hay cuatro sitios (lo pidió el usuario): los de una sección sin sitio no salen.
  // Fija el conjunto entero: un cromo nuevo que se quede sin sitio obliga a decidir dónde vive.
  it('solo se quedan fuera los cinco de La Colmena', () => {
    const sinSitio = CREW.filter((miembro) => !lugarDe(miembro.vistoEn?.to)).map((m) => m.nombre);

    expect(lugarDe('/estudio')).toBeNull();
    expect(sinSitio).toEqual(['El Productor', 'El Freeze', 'El Colgao', 'El Tele', 'El Luna']);
  });

  it('dos se dicen con «y» y uno solo, tal cual', () => {
    expect(resumen(['El Portero', 'El Estrella'])).toBe('El Portero y El Estrella');
    expect(resumen(['El Turista'])).toBe('El Turista');
    expect(resumen()).toBe('');
  });

  it('una ruta que no es de ningún sitio no se pinta', () => {
    expect(lugarDe('/legal/cookies')).toBeNull();
  });

  // VECINOS se calcula al cargar el módulo: un cromo a medias no puede tumbar el mapa.
  it('un cromo sin «visto en» no se pinta, y el resto sí', () => {
    const vecinosRaros = vecinosDe([
      { nombre: 'El Nuevo' },
      { nombre: 'El Ollie', vistoEn: { to: '/menudrop' } },
    ]);

    expect(vecinosRaros.get('callejon')).toEqual(['El Ollie']);
    expect([...vecinosRaros.values()].flat()).not.toContain('El Nuevo');
  });
});
