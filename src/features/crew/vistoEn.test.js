import { describe, expect, it } from 'vitest';
import { CREW } from '../../data/crew.js';
import { vistoEnTo } from './vistoEn.js';

/* Adónde lleva el «Visto en» de cada cromo (album-sin-enlaces-rotos). Los productos cambian con
   cada drop y con la tienda: un cromo que vive en las fichas no guarda ningún handle. */
const deCromo = (id) => CREW.find((miembro) => miembro.id === id).vistoEn;
const CATALOGO = [{ handle: 'rocky-ya-llego' }, { handle: 'rocky-nada-en-la-tele' }];

describe('los «Visto en» del álbum', () => {
  it('ninguno apunta a una ficha escrita a mano', () => {
    const fichas = CREW.filter((miembro) => miembro.vistoEn?.to?.startsWith('/product/'));

    expect(fichas.map((miembro) => miembro.nombre)).toEqual([]);
  });

  it('El Vigía y El Nube viven en cualquier ficha, y nadie más', () => {
    const enCualquierFicha = CREW.filter((miembro) => miembro.vistoEn?.anyProductPage);

    expect(enCualquierFicha.map((miembro) => miembro.nombre)).toEqual(['El Vigía', 'El Nube']);
    for (const miembro of enCualquierFicha) expect(miembro.vistoEn.to).toBe('/');
  });
});

describe('vistoEnTo', () => {
  it('con catálogo, lleva a la ficha del primer producto', () => {
    expect(vistoEnTo(deCromo('vigia'), CATALOGO)).toBe('/product/rocky-ya-llego');
    expect(vistoEnTo(deCromo('nube'), CATALOGO)).toBe('/product/rocky-ya-llego');
  });

  it('codifica el handle, como el resto de enlaces a fichas', () => {
    expect(vistoEnTo(deCromo('vigia'), [{ handle: 'rocky 35/ñ' }])).toBe(
      '/product/rocky%2035%2F%C3%B1'
    );
  });

  it('sin catálogo, o con uno vacío, lleva a la tienda', () => {
    expect(vistoEnTo(deCromo('nube'), [])).toBe('/');
    expect(vistoEnTo(deCromo('nube'))).toBe('/');
    expect(vistoEnTo(deCromo('nube'), null)).toBe('/');
    expect(vistoEnTo(deCromo('nube'), [{ handle: '' }])).toBe('/');
  });

  it('los demás cromos conservan su enlace, haya catálogo o no', () => {
    for (const productos of [CATALOGO, []]) {
      expect(vistoEnTo(deCromo('recadero'), productos)).toBe('/products/agotado');
      expect(vistoEnTo(deCromo('portero'), productos)).toBe('/rockyIA');
    }
  });
});
