import { afterEach, describe, expect, it } from 'vitest';
import { artBox } from './geometry.js';
import {
  BLOCKED_ATTRIBUTE,
  MAX_SPOT_NODES,
  collectSpots,
  readBlockedZones,
  readViewport,
} from './domProbe.js';

const VIEW = Object.freeze({ width: 1024, height: 768, top: 70, bottom: 762 });
const PAPEL = 'background-color: rgb(255, 253, 248)';

function conCaja(el, [left, top, width, height]) {
  el.getBoundingClientRect = () => ({
    left, top, width, height, right: left + width, bottom: top + height,
  });
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('sondas del muñeco: la pantalla y las zonas vetadas', () => {
  it('reserva la franja de la barra de navegación', () => {
    document.body.innerHTML = '<div class="navbar"></div>';
    const navbar = document.querySelector('.navbar');
    navbar.getBoundingClientRect = () => ({ top: 0, bottom: 66, left: 0, right: 1024 });

    expect(readViewport().top).toBeGreaterThan(66);
  });

  it('reserva la composición editorial de la portada para que no tape su CTA', () => {
    document.body.innerHTML = '<section class="product-page-head--home"></section>';
    const hero = document.querySelector('.product-page-head--home');
    hero.getBoundingClientRect = () => ({
      top: 120,
      bottom: 560,
      left: 40,
      right: 984,
      width: 944,
      height: 440,
    });

    expect(readBlockedZones()).toContainEqual({
      top: 120,
      bottom: 560,
      left: 40,
      right: 984,
    });
  });

  it('respeta cualquier bloque que lleve el atributo data-peeker-blocked', () => {
    // El contrato oficial: sin que el muñeco conozca la clase del componente.
    document.body.innerHTML = `<aside class="lo-que-sea" ${BLOCKED_ATTRIBUTE}></aside>`;
    conCaja(document.querySelector('aside'), [600, 500, 300, 120]);

    expect(readBlockedZones()).toContainEqual({
      top: 500,
      bottom: 620,
      left: 600,
      right: 900,
    });
  });
});

describe('sondas del muñeco: qué vale de escondite', () => {
  it('pide que el bloque sea más grande que el muñeco', () => {
    const art = artBox(1);
    document.body.innerHTML = `
      <section class="grande" style="${PAPEL}"></section>
      <section class="chato" style="${PAPEL}"></section>
      <section class="angosto" style="${PAPEL}"></section>`;
    // Más alto y vez y media más ancho que él: vale.
    conCaja(document.querySelector('.grande'), [100, 200, art.width * 2, art.height * 2]);
    // Del alto de un botón: por detrás de eso no se esconde nadie.
    conCaja(document.querySelector('.chato'), [100, 200, art.width * 2, art.height - 6]);
    // Justo de su ancho: tampoco.
    conCaja(document.querySelector('.angosto'), [100, 200, art.width * 1.2, art.height * 2]);

    expect(collectSpots(VIEW, 1).map((s) => s.element.className)).toEqual(['grande']);
  });

  it('acepta una franja interior con línea encima y algo opaco detrás', () => {
    document.body.innerHTML = `
      <article class="tarjeta" style="${PAPEL}">
        <div class="foto" style="border-bottom: 2px solid rgb(26, 26, 26)"></div>
        <div class="franja"></div>
      </article>`;
    conCaja(document.querySelector('.tarjeta'), [100, 200, 260, 420]);
    conCaja(document.querySelector('.foto'), [100, 200, 260, 260]);
    conCaja(document.querySelector('.franja'), [100, 460, 260, 160]);

    const spots = collectSpots(VIEW, 1);
    const franja = spots.find((s) => s.element.className === 'franja');
    // La franja no pinta fondo, pero el canto por el que asoma sí está dibujado
    // —es el borde de abajo de la foto— y detrás tiene la tarjeta opaca.
    expect(franja).toBeDefined();
    // Sus laterales no están pintados, así que ahí no puede hacer la esquina.
    expect(franja.topOnly).toBe(true);
    expect(spots.find((s) => s.element.className === 'tarjeta').topOnly).toBe(false);
  });

  it('descarta una franja interior sin línea encima', () => {
    document.body.innerHTML = `
      <article class="tarjeta" style="${PAPEL}">
        <div class="foto"></div>
        <div class="franja"></div>
      </article>`;
    conCaja(document.querySelector('.tarjeta'), [100, 200, 260, 420]);
    conCaja(document.querySelector('.foto'), [100, 200, 260, 260]);
    conCaja(document.querySelector('.franja'), [100, 460, 260, 160]);

    expect(collectSpots(VIEW, 1).map((s) => s.element.className)).toEqual(['tarjeta']);
  });

  it('en una página larga también encuentra escondites al final', () => {
    // Crew: cientos de bloques por encima del tope, y el usuario ha bajado
    // hasta el final. Los de arriba quedan fuera de pantalla y no cuentan para
    // el tope, así que los dos últimos, que sí se ven, tienen que salir.
    const total = MAX_SPOT_NODES + 120;
    document.body.innerHTML = Array.from(
      { length: total },
      (_, i) => `<section class="bloque-${i}" style="${PAPEL}"></section>`
    ).join('');
    const visibles = [total - 5, total - 4];
    document.querySelectorAll('section').forEach((el, i) => {
      conCaja(el, [100, 100 + (i - visibles[0]) * 400, 400, 300]);
    });

    expect(collectSpots(VIEW, 1).map((s) => s.element.className)).toEqual(
      visibles.map((i) => `bloque-${i}`)
    );
  });

  it('acota lo que mira en pantalla al tope, y no se pasa', () => {
    // Todos a la vista y todos válidos: sólo se estudian los primeros del tope.
    const total = MAX_SPOT_NODES + 40;
    document.body.innerHTML = Array.from(
      { length: total },
      () => `<section style="${PAPEL}"></section>`
    ).join('');
    document.querySelectorAll('section').forEach((el) => conCaja(el, [100, 200, 400, 300]));

    expect(collectSpots(VIEW, 1)).toHaveLength(MAX_SPOT_NODES);
  });
});
