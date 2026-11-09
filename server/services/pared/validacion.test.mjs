import { describe, expect, it } from 'vitest';
import { LIMITES, esAncho, esPagina, esPaginaFija, paredDe, validarTrazo } from './validacion.mjs';

const trazo = (patch = {}) => ({
  c: 0,
  s: 123,
  p: [-10, 200, -8, 204],
  d: [[-8, 204, 40]],
  ...patch,
});

describe('páginas y anchos de la pared', () => {
  it('acepta las secciones fijas, las fichas y las páginas de drop', () => {
    for (const pagina of [
      '/',
      '/menudrop',
      '/estudio',
      '/crew',
      '/mi-crew',
      '/rockyIA',
      '/cart',
      '/legal/privacidad',
      '/product/rocky-el-jefe',
      '/products/rocky-drop-6',
    ]) {
      expect(esPagina(pagina), pagina).toBe(true);
    }
  });

  it('rechaza rutas inventadas, El Taller y cualquier truco', () => {
    for (const pagina of [
      '/taller',
      '/inventada',
      '/product/',
      '/product/../taller',
      '/product/ROCKY',
      '/estudio/',
      '//estudio',
      '/product/a%2Fb',
      '/legal/zz-auditoria',
      'estudio',
      '',
      null,
      ['/estudio'],
      `/product/${'a'.repeat(200)}`,
    ]) {
      expect(esPagina(pagina), String(pagina)).toBe(false);
    }
  });

  it('solo hay dos anchos', () => {
    expect(esAncho('ancha')).toBe(true);
    expect(esAncho('estrecha')).toBe(true);
    expect(esAncho('mediana')).toBe(false);
    expect(paredDe('/crew', 'ancha')).toBe('/crew|ancha');
  });
});

describe('validación de trazos', () => {
  it('acepta un trazo del spray y lo devuelve limpio, con enteros', () => {
    const resultado = validarTrazo(trazo({ p: [1.4, 2.6], d: [[1.2, 2.7, 30.4]] }));
    expect(resultado).toEqual({ ok: true, trazo: { c: 0, s: 123, p: [1, 3], d: [[1, 3, 30]] } });
  });

  it('solo copia los campos conocidos (nada de firma ni __proto__)', () => {
    const malicioso = JSON.parse(
      '{"c":1,"s":5,"p":[0,0],"d":[],"firma":"YO-1","__proto__":{"x":1},"id":"zz"}'
    );
    const { trazo: limpio } = validarTrazo(malicioso);
    expect(Object.keys(limpio).sort()).toEqual(['c', 'd', 'p', 's']);
    expect(limpio.x).toBeUndefined();
  });

  it.each([
    ['color fuera de la paleta', { c: 3 }],
    ['color decimal', { c: 0.5 }],
    ['semilla negativa', { s: -1 }],
    ['semilla enorme', { s: 2 ** 32 }],
    ['puntos impares', { p: [0, 0, 1] }],
    ['sin puntos', { p: [] }],
    ['punto no numérico', { p: [0, 'a'] }],
    ['NaN', { p: [0, Number.NaN] }],
    ['dx fuera de rango', { p: [LIMITES.dx + 1, 10] }],
    ['y negativa', { p: [0, -1] }],
    ['y fuera de rango', { p: [0, LIMITES.y + 1] }],
    ['demasiados puntos', { p: Array(LIMITES.puntosPorTrazo * 2 + 2).fill(1) }],
    ['demasiados chorretones', { d: Array(LIMITES.chorretones + 1).fill([0, 0, 30]) }],
    ['chorretón deforme', { d: [[0, 0]] }],
    ['chorretón larguísimo', { d: [[0, 0, 500]] }],
    ['no es objeto', null],
  ])('rechaza: %s', (_, patch) => {
    const entrada = patch === null ? null : trazo(patch);
    const resultado = validarTrazo(entrada);
    expect(resultado.ok).toBe(false);
    expect(resultado.message).toMatch(/[a-záéíóú]/i);
  });
});

describe('las páginas fijas', () => {
  it('son las secciones y las legales; las de producto no', () => {
    expect(esPaginaFija('/crew')).toBe(true);
    expect(esPaginaFija('/legal/cookies')).toBe(true);
    expect(esPaginaFija('/product/rocky-el-jefe')).toBe(false);
    expect(esPaginaFija('/products/rocky-drop-6')).toBe(false);
  });
});
