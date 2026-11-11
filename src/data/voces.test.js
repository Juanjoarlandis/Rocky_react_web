import { describe, expect, it } from 'vitest';
import { CREW } from './crew.js';
import { VOCES, NOMBRES_DE_LA_CREW } from './voces.js';

/* Las voces de la crew (voz-de-la-crew) viven aparte del álbum para no meter los
   veinticinco cromos en la ficha, pero tienen que casar con él. */
describe('las voces de la crew', () => {
  it('cada miembro del álbum tiene voz, y cada voz es de un miembro del álbum', () => {
    expect([...NOMBRES_DE_LA_CREW].sort()).toEqual(CREW.map((miembro) => miembro.nombre).sort());
  });

  it('cada voz lleva el dibujo de su cromo', () => {
    for (const miembro of CREW) {
      expect(VOCES[miembro.nombre].img, miembro.nombre).toBe(miembro.img);
    }
  });

  it('cada muñeco grita una o dos palabras', () => {
    for (const nombre of NOMBRES_DE_LA_CREW) {
      const palabras = VOCES[nombre].grito.trim().split(/\s+/);

      expect(palabras.length, nombre).toBeGreaterThanOrEqual(1);
      expect(palabras.length, nombre).toBeLessThanOrEqual(2);
    }
  });

  // La cabeza de la firma es un recorte ampliado del dibujo (design.md, D3):
  // donde la cabeza no está arriba en el centro, la voz dice dónde mirar.
  it('el foco del recorte, cuando lo hay, es una posición en porcentajes', () => {
    for (const nombre of NOMBRES_DE_LA_CREW) {
      const { foco } = VOCES[nombre];
      if (foco !== undefined) expect(foco, nombre).toMatch(/^\d{1,3}% \d{1,3}%$/);
    }
    expect(VOCES['El Paquetes'].foco).toBe('10% 16%');
  });

  it('Los Fundadores, dibujados en línea blanca para el pie, van sobre fondo oscuro', () => {
    expect(VOCES['Los Fundadores'].oscuro).toBe(true);
    expect(NOMBRES_DE_LA_CREW.filter((nombre) => VOCES[nombre].oscuro)).toEqual(['Los Fundadores']);
  });
});
