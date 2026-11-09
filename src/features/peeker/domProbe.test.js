import { afterEach, describe, expect, it } from 'vitest';
import { artBox } from './geometry.js';
import {
  BLOCKED_ATTRIBUTE,
  MAX_SPOT_NODES,
  collectSpots,
  edgeIsPainted,
  readBlockedZones,
  readViewport,
} from './domProbe.js';

const VIEW = Object.freeze({ width: 1024, height: 768, top: 70, bottom: 762 });
const PAPEL = 'background-color: rgb(255, 253, 248)';

function conCaja(el, [left, top, width, height]) {
  el.getBoundingClientRect = () => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
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

/* El Curioso solo se asoma por cantos de componentes, nunca desde detrás de una
   imagen ni de algo que se transparenta (cambio curioso-se-asoma-por-componentes). */
describe('sondas del muñeco: sin imágenes de por medio', () => {
  const PUNTEADO =
    'background-image: radial-gradient(circle, rgba(26, 26, 26, 0.07) 1.2px, transparent 1.2px)';

  it('un bloque que solo pinta una imagen de fondo no vale de escondite', () => {
    const art = artBox(1);
    document.body.innerHTML = `
      <section class="punteado" style="${PUNTEADO}"></section>
      <section class="papel" style="${PAPEL}; ${PUNTEADO}"></section>`;
    conCaja(document.querySelector('.punteado'), [100, 200, art.width * 2, art.height * 2]);
    conCaja(document.querySelector('.papel'), [500, 200, art.width * 2, art.height * 2]);
    // Entre los puntos se transparenta: el recorte quedaría en el aire.
    expect(collectSpots(VIEW, 1).map((s) => s.element.className)).toEqual(['papel']);
  });

  function tarjetaConFoto() {
    document.body.innerHTML = `
      <article class="tarjeta" style="${PAPEL}">
        <div class="foto"><img class="img" alt=""></div>
        <div class="cuerpo"></div>
      </article>
      <div class="otro"></div>`;
    const tarjeta = conCaja(document.querySelector('.tarjeta'), [100, 200, 260, 420]);
    conCaja(document.querySelector('.foto'), [100, 200, 260, 260]);
    const cuerpo = conCaja(document.querySelector('.cuerpo'), [100, 460, 260, 160]);
    const img = document.querySelector('.img');
    return { tarjeta, cuerpo, img };
  }

  afterEach(() => {
    delete document.elementFromPoint;
  });

  it('descarta asomarse por arriba de una tarjeta cuya parte de arriba es la foto', () => {
    const { tarjeta, cuerpo, img } = tarjetaConFoto();
    document.elementFromPoint = (_x, y) => (y < 460 ? img : cuerpo);
    const spot = { element: tarjeta, rect: tarjeta.getBoundingClientRect() };
    expect(
      edgeIsPainted({ pose: 'arriba', left: 150, top: 100, width: 100, height: 110 }, spot)
    ).toBe(false);
  });

  it('acepta la franja bajo la foto: su canto es la línea del componente', () => {
    const { cuerpo, img } = tarjetaConFoto();
    document.elementFromPoint = (_x, y) => (y < 460 ? img : cuerpo);
    const spot = { element: cuerpo, rect: cuerpo.getBoundingClientRect(), topOnly: true };
    expect(
      edgeIsPainted({ pose: 'arriba', left: 150, top: 360, width: 100, height: 110 }, spot)
    ).toBe(true);
  });

  /* En el DOM de verdad la línea la pinta la foto (su borde inferior, con
     position: relative, queda encima) y, con la tarjeta girada, las cajas de
     los dos hermanos se solapan: los primeros píxeles del canto son de la foto. */
  it('acepta la franja aunque la línea que pinta su canto sea del hermano de arriba', () => {
    const art = artBox(1);
    const ancho = Math.round(art.width * 2);
    document.body.innerHTML = `
      <article class="tarjeta" style="${PAPEL}">
        <div class="foto" style="border-bottom: 2px solid"><img class="img" alt=""></div>
        <div class="cuerpo"></div>
      </article>`;
    conCaja(document.querySelector('.tarjeta'), [100, 100, ancho, 360 + art.height]);
    const foto = conCaja(document.querySelector('.foto'), [100, 100, ancho, 360]);
    const cuerpo = conCaja(document.querySelector('.cuerpo'), [100, 459, ancho, art.height]);
    document.elementFromPoint = (_x, y) => (y <= 461 ? foto : cuerpo);
    const spot = collectSpots(VIEW, 1).find((s) => s.element === cuerpo);
    expect(spot).toMatchObject({ topOnly: true, lineOwner: foto });
    const encima = { pose: 'arriba', left: 150, top: 360, width: 100, height: 110 };
    expect(edgeIsPainted(encima, spot)).toBe(true);
  });

  it('en la esquina, vale el tramo junto al papel y no el que cae a la altura de la foto', () => {
    const { tarjeta, cuerpo, img } = tarjetaConFoto();
    document.elementFromPoint = (_x, y) => (y < 460 ? img : cuerpo);
    const spot = { element: tarjeta, rect: tarjeta.getBoundingClientRect() };
    const esquina = { pose: 'esquina', side: 'izq', left: 40, width: 80, height: 120 };
    expect(edgeIsPainted({ ...esquina, top: 490 }, spot)).toBe(true);
    expect(edgeIsPainted({ ...esquina, top: 300 }, spot)).toBe(false);
  });

  it('descarta un tramo que tapa otro elemento aunque más adentro siga la tarjeta', () => {
    const { tarjeta, cuerpo } = tarjetaConFoto();
    const otro = document.querySelector('.otro');
    // Los 3 px de fuera son de otro elemento; detrás, el papel de la tarjeta.
    document.elementFromPoint = (x) => (x > 360 - 3 ? otro : cuerpo);
    const spot = { element: tarjeta, rect: tarjeta.getBoundingClientRect() };
    expect(
      edgeIsPainted(
        { pose: 'esquina', side: 'der', left: 330, top: 490, width: 80, height: 120 },
        spot
      )
    ).toBe(false);
  });

  it('descarta el canto de papel si 4 px más adentro ya está la foto', () => {
    const { tarjeta, img } = tarjetaConFoto();
    document.elementFromPoint = (_x, y) => (y < 200 + 3 ? tarjeta : img);
    const spot = { element: tarjeta, rect: tarjeta.getBoundingClientRect() };
    expect(
      edgeIsPainted({ pose: 'arriba', left: 150, top: 100, width: 100, height: 110 }, spot)
    ).toBe(false);
  });

  it('descarta un tramo que tapa otro elemento que no es del bloque', () => {
    const { tarjeta } = tarjetaConFoto();
    const otro = document.querySelector('.otro');
    document.elementFromPoint = () => otro;
    const spot = { element: tarjeta, rect: tarjeta.getBoundingClientRect() };
    expect(
      edgeIsPainted(
        { pose: 'esquina', side: 'der', left: 330, top: 490, width: 80, height: 120 },
        spot
      )
    ).toBe(false);
  });

  /* Las tarjetas de ROCKY van giradas y con el borde a mano: el rectángulo del
     navegador cae por fuera del trazo y los primeros píxeles son del contenedor. */
  function tarjetaGirada() {
    document.body.innerHTML = `
      <div class="parrilla">
        <article class="tarjeta" style="${PAPEL}">
          <div class="foto"><img class="img" alt=""></div>
          <div class="cuerpo"></div>
        </article>
      </div>`;
    const tarjeta = conCaja(document.querySelector('.tarjeta'), [100, 200, 260, 420]);
    return {
      tarjeta,
      parrilla: document.querySelector('.parrilla'),
      cuerpo: document.querySelector('.cuerpo'),
      img: document.querySelector('.img'),
    };
  }

  it('con el canto girado busca el trazo hacia dentro: la esquina sobre el papel vale', () => {
    const { tarjeta, parrilla, cuerpo } = tarjetaGirada();
    // Los 9 px de la derecha son del contenedor; más adentro, el papel de la tarjeta.
    document.elementFromPoint = (x) => (x > 360 - 9 ? parrilla : cuerpo);
    const spot = { element: tarjeta, rect: tarjeta.getBoundingClientRect() };
    expect(
      edgeIsPainted(
        { pose: 'esquina', side: 'der', left: 330, top: 490, width: 80, height: 120 },
        spot
      )
    ).toBe(true);
  });

  it('con el canto girado, si detrás del trazo está la foto, sigue vetando', () => {
    const { tarjeta, parrilla, img } = tarjetaGirada();
    document.elementFromPoint = (_x, y) => (y < 200 + 7 ? parrilla : img);
    const spot = { element: tarjeta, rect: tarjeta.getBoundingClientRect() };
    expect(
      edgeIsPainted({ pose: 'arriba', left: 150, top: 100, width: 100, height: 110 }, spot)
    ).toBe(false);
  });

  it('veta un dibujo decorativo sobre el canto aunque no reciba el puntero', () => {
    document.body.innerHTML = `
      <article class="tarjeta" style="${PAPEL}">
        <img class="doodle" alt="" style="pointer-events: none">
      </article>`;
    const tarjeta = conCaja(document.querySelector('.tarjeta'), [100, 200, 260, 420]);
    // El muñeco tumbado en el canto de arriba: elementFromPoint no lo ve.
    conCaja(document.querySelector('.doodle'), [120, 150, 200, 80]);
    document.elementFromPoint = () => tarjeta;
    const spot = { element: tarjeta, rect: tarjeta.getBoundingClientRect() };
    expect(
      edgeIsPainted({ pose: 'arriba', left: 150, top: 100, width: 100, height: 110 }, spot)
    ).toBe(false);
  });

  /* Los dibujos de una repisa (.doodle-shelf) son hermanos del bloque, no hijos:
     el carrito con el dormilón encima, la tele sobre la tarjeta de escucha. */
  it('veta un dibujo de la repisa que pisa el canto aunque sea hermano del bloque', () => {
    document.body.innerHTML = `
      <div class="doodle-shelf">
        <img class="doodle" alt="" style="pointer-events: none">
        <article class="tarjeta" style="${PAPEL}"></article>
      </div>`;
    const tarjeta = conCaja(document.querySelector('.tarjeta'), [100, 200, 260, 420]);
    conCaja(document.querySelector('.doodle'), [120, 150, 200, 80]);
    document.elementFromPoint = () => tarjeta;
    const spot = { element: tarjeta, rect: tarjeta.getBoundingClientRect() };
    expect(
      edgeIsPainted({ pose: 'arriba', left: 150, top: 100, width: 100, height: 110 }, spot)
    ).toBe(false);
  });

  /* Asomado por arriba se agarra al canto casi de punta a punta (del 1 al 99 %
     del dibujo): un dibujo en la punta del tramo también le pisa las manos. */
  it('veta un dibujo que solo pisa la punta del tramo de arriba', () => {
    document.body.innerHTML = `
      <div class="doodle-shelf">
        <img class="doodle punta" alt="" style="pointer-events: none">
        <img class="doodle fuera" alt="" style="pointer-events: none">
        <article class="tarjeta" style="${PAPEL}"></article>
      </div>`;
    const tarjeta = conCaja(document.querySelector('.tarjeta'), [100, 200, 260, 420]);
    document.elementFromPoint = () => tarjeta;
    const spot = { element: tarjeta, rect: tarjeta.getBoundingClientRect() };
    const arriba = { pose: 'arriba', left: 150, top: 100, width: 100, height: 110 };
    // Un dibujo justo a la derecha del tramo no le toca.
    conCaja(document.querySelector('.fuera'), [252, 150, 60, 60]);
    expect(edgeIsPainted(arriba, spot)).toBe(true);
    // Uno que cubre su último 8 %, sí.
    conCaja(document.querySelector('.punta'), [242, 150, 60, 60]);
    expect(edgeIsPainted(arriba, spot)).toBe(false);
  });

  it('un dibujo invisible de la repisa no veta el canto', () => {
    document.body.innerHTML = `
      <div class="doodle-shelf">
        <img class="doodle" alt="" style="pointer-events: none; opacity: 0">
        <article class="tarjeta" style="${PAPEL}"></article>
      </div>`;
    const tarjeta = conCaja(document.querySelector('.tarjeta'), [100, 200, 260, 420]);
    conCaja(document.querySelector('.doodle'), [120, 150, 200, 80]);
    document.elementFromPoint = () => tarjeta;
    const spot = { element: tarjeta, rect: tarjeta.getBoundingClientRect() };
    expect(
      edgeIsPainted({ pose: 'arriba', left: 150, top: 100, width: 100, height: 110 }, spot)
    ).toBe(true);
  });

  it('sin elementFromPoint (jsdom) no veta nada', () => {
    const { tarjeta } = tarjetaConFoto();
    const spot = { element: tarjeta, rect: tarjeta.getBoundingClientRect() };
    expect(
      edgeIsPainted({ pose: 'arriba', left: 150, top: 100, width: 100, height: 110 }, spot)
    ).toBe(true);
  });
});
