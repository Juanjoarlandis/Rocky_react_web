import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CuriousPeeker, {
  artBox,
  biteEdge,
  choosePlacement,
  collectSpots,
  placeAtCorner,
  placeOnEdge,
  readBlockedZones,
  readViewport,
  shadowExtents,
  topEdgeOf,
} from './CuriousPeeker.jsx';

const VIEW = Object.freeze({ width: 1024, height: 768, top: 70, bottom: 762 });
const SIN_SOMBRA = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

// Con Math.random fijo los tiempos quedan en el centro de cada rango.
const FIRST_WAIT = 6_000;
const VISIBLE_FOR = 3_100;
const GAP = 13_000;

function advance(ms) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

// La clase visible se activa en el frame siguiente al montaje.
function advanceToPeek(ms) {
  advance(ms);
  act(() => {
    vi.advanceTimersToNextFrame();
  });
}

function stubMedia(activeQuery) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query) => ({ matches: query === activeQuery }))
  );
}

describe('CuriousPeeker: dónde se agarra', () => {
  it('deja el canto del dibujo justo sobre el borde del escondite', () => {
    const rect = { top: 300, bottom: 600, left: 200, right: 640 };
    const place = placeOnEdge(topEdgeOf(rect), VIEW, 1, 0.5);

    expect(place.top + place.height).toBe(rect.top);
    expect(place.left).toBeGreaterThanOrEqual(rect.left);
    expect(place.left + place.width).toBeLessThanOrEqual(rect.right);
  });

  it('se queda en el tramo central del canto, lejos de las esquinas', () => {
    const rect = { top: 300, bottom: 600, left: 0, right: 1000 };
    const art = artBox(1);
    const pegadoAlPrincipio = placeOnEdge(topEdgeOf(rect), VIEW, 1, 0);
    const pegadoAlFinal = placeOnEdge(topEdgeOf(rect), VIEW, 1, 1);

    expect(pegadoAlPrincipio.left).toBeGreaterThan(rect.left + art.width * 0.5);
    expect(pegadoAlFinal.left + art.width).toBeLessThan(rect.right - art.width * 0.5);
  });

  it('muerde el canto para que las manos no queden flotando', () => {
    const rect = { top: 300, bottom: 600, left: 200, right: 640 };
    const place = placeOnEdge(topEdgeOf(rect), VIEW, 1, 0.5);
    const mordido = biteEdge(place, { x: 0, y: 5 });

    expect(mordido.top).toBe(place.top + 5);
    expect(mordido.top + mordido.height).toBe(rect.top + 5);
  });

  it('en la esquina, la ventana sale de 360/620 y 820/620 del lienzo', () => {
    const rect = { top: 200, bottom: 620, left: 400, right: 800 };
    const art = artBox(1, 'esquina');
    const place = placeAtCorner(rect, 'izq', VIEW, 1);

    // Franja visible y alto del PNG, más el hueco de estiramiento hacia fuera.
    expect(art.cut).toBe(Math.round((art.width * 360) / 620));
    expect(art.height).toBe(Math.round((art.width * 820) / 620));
    expect(place.width).toBe(art.cut + art.room);
    expect(place.height).toBe(art.height + art.room);
    expect(place.pose).toBe('esquina');
  });

  it('la línea de agarre cae en el lateral del bloque y la suela en su base', () => {
    const rect = { top: 200, bottom: 620, left: 400, right: 800 };
    const izq = placeAtCorner(rect, 'izq', VIEW, 1);
    const der = placeAtCorner(rect, 'der', VIEW, 1);

    // Izquierda: el canto derecho de la ventana es el lateral de la tarjeta.
    expect(izq.left + izq.width).toBe(rect.left);
    // Derecha (espejada): el canto izquierdo lo es.
    expect(der.left).toBe(rect.right);
    // En las dos, el canto de abajo es la base de la tarjeta.
    expect(izq.top + izq.height).toBe(rect.bottom);
    expect(der.top + der.height).toBe(rect.bottom);
    expect([izq.side, der.side]).toEqual(['izq', 'der']);
  });

  it('la esquina muerde hacia el bloque, y hacia el lado que toca', () => {
    const rect = { top: 200, bottom: 620, left: 400, right: 800 };
    const bite = { x: 4, y: -9 };
    const izq = biteEdge(placeAtCorner(rect, 'izq', VIEW, 1), bite);
    const der = biteEdge(placeAtCorner(rect, 'der', VIEW, 1), bite);

    // La mano se mete 4 px en la tarjeta por su lado, no siempre hacia la misma
    // dirección de la pantalla.
    expect(izq.left + izq.width).toBe(rect.left + 4);
    expect(der.left).toBe(rect.right - 4);
    // La base sube 9 px hasta el trazo pintado de la esquina.
    expect(izq.top + izq.height).toBe(rect.bottom - 9);
  });

  it('lee cuánto sobresale la sombra por cada lado', () => {
    // La sombra de ROCKY: bloque de tinta duro abajo y a la derecha.
    expect(shadowExtents('rgb(26, 26, 26) 5px 5px 0px 0px')).toEqual({
      top: 0,
      right: 5,
      bottom: 5,
      left: 0,
    });
    // Con desenfoque crece por los cuatro lados; el color lleva comas dentro.
    expect(shadowExtents('rgba(26, 26, 26, 0.5) 0px 4px 6px 2px')).toEqual({
      top: 4,
      right: 8,
      bottom: 12,
      left: 8,
    });
    // Las de dentro no sobresalen, y varias capas se quedan con la mayor.
    expect(shadowExtents('rgb(0, 0, 0) 0px 0px 0px 1px inset')).toEqual(SIN_SOMBRA);
    expect(shadowExtents('rgb(0, 0, 0) 2px 2px 0px, rgb(0, 0, 0) 8px 3px 0px').right).toBe(8);
    expect(shadowExtents('none')).toEqual(SIN_SOMBRA);
  });

  it('sale por fuera de la sombra, no por encima de ella', () => {
    const rect = { top: 200, bottom: 620, left: 400, right: 800 };
    const sombra = { top: 0, right: 5, bottom: 5, left: 0 };
    const der = placeAtCorner(rect, 'der', VIEW, 1, sombra);
    const izq = placeAtCorner(rect, 'izq', VIEW, 1, sombra);

    // A la derecha la sombra empuja el canto de la ventana 5 px hacia fuera.
    expect(der.left).toBe(rect.right + 5);
    // A la izquierda no hay sombra que esquivar, así que no se mueve.
    expect(izq.left + izq.width).toBe(rect.left);
    // Y el canto de arriba tampoco: la sombra cae hacia el otro lado.
    expect(topEdgeOf(rect, sombra).line).toBe(rect.top);
  });

  it('descarta una esquina en un bloque estrecho', () => {
    // Al lado de algo poco más ancho que lo que él saca, se rompe la escala.
    const art = artBox(1, 'esquina');
    const estrecho = { top: 200, bottom: 620, left: 400, right: 400 + art.cut * 2.5 };
    expect(placeAtCorner(estrecho, 'izq', VIEW, 1)).toBeNull();

    const holgado = { top: 200, bottom: 620, left: 400, right: 400 + art.cut * 3.2 };
    expect(placeAtCorner(holgado, 'izq', VIEW, 1)).not.toBeNull();
  });

  it('descarta una esquina en un bloque más bajo que el dibujo', () => {
    const bajo = { top: 500, bottom: 620, left: 400, right: 800 };
    expect(placeAtCorner(bajo, 'izq', VIEW, 1)).toBeNull();

    const pegadoAlBorde = { top: 200, bottom: 620, left: 10, right: 800 };
    expect(placeAtCorner(pegadoAlBorde, 'izq', VIEW, 1)).toBeNull();
  });

  it('descarta un canto que no deja sitio en pantalla', () => {
    const pegadoArriba = { top: 4, bottom: 300, left: 200, right: 640 };
    expect(placeOnEdge(topEdgeOf(pegadoArriba), VIEW, 1, 0.5)).toBeNull();

    const estrecho = { top: 200, bottom: 400, left: 200, right: 300 };
    expect(placeOnEdge(topEdgeOf(estrecho), VIEW, 1, 0.5)).toBeNull();
  });

  it('reserva la franja de la barra de navegación', () => {
    document.body.innerHTML = '<div class="navbar"></div>';
    const navbar = document.querySelector('.navbar');
    navbar.getBoundingClientRect = () => ({ top: 0, bottom: 66, left: 0, right: 1024 });

    expect(readViewport().top).toBeGreaterThan(66);
    document.body.innerHTML = '';
  });

  it('no se coloca encima de otro bloque de la página', () => {
    // Dos filas pegadas: sobre la de abajo no cabe sin pisar la de arriba.
    const spots = [
      { element: {}, rect: { top: 160, bottom: 400, left: 100, right: 700 } },
      { element: {}, rect: { top: 420, bottom: 660, left: 100, right: 700 } },
    ];

    for (let intento = 0; intento < 40; intento += 1) {
      const chosen = choosePlacement({ view: VIEW, scale: 1, spots, zones: [], avoidKey: null });
      const invade = spots.some((spot) => {
        if (spot.element === chosen.element) return false;
        const ancho =
          Math.min(chosen.left + chosen.width, spot.rect.right) -
          Math.max(chosen.left, spot.rect.left);
        const alto =
          Math.min(chosen.top + chosen.height, spot.rect.bottom) -
          Math.max(chosen.top, spot.rect.top);
        return ancho > 0 && alto > 0 && (ancho * alto) / (chosen.width * chosen.height) > 0.3;
      });
      expect(invade).toBe(false);
    }
  });

  it('respeta las zonas flotantes reservadas', () => {
    const spots = [{ element: {}, rect: { top: 200, bottom: 620, left: 100, right: 700 } }];
    const zones = [{ top: 0, bottom: VIEW.height, left: 0, right: VIEW.width }];

    expect(choosePlacement({ view: VIEW, scale: 1, spots, zones, avoidKey: null })).toBeNull();
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

    document.body.innerHTML = '';
  });

  it('siempre puede entrar por el filo de abajo de la pantalla', () => {
    const chosen = choosePlacement({ view: VIEW, scale: 1, spots: [], zones: [], avoidKey: null });

    expect(chosen.key).toBe('pantalla');
    expect(chosen.element).toBeNull();
    expect(chosen.top + chosen.height).toBe(VIEW.height);
  });
});

describe('CuriousPeeker: qué vale de escondite', () => {
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
    expect(franja.soloArriba).toBe(true);
    expect(spots.find((s) => s.element.className === 'tarjeta').soloArriba).toBe(false);
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

  it('salir por encima de la tarjeta que contiene su franja no cuenta como pisarla', () => {
    // La tarjeta llega hasta arriba del todo (no le cabe asomarse por su canto)
    // y es estrecha para las esquinas, así que el único escondite es la franja.
    const tarjeta = { top: VIEW.top, bottom: 620, left: 100, right: 280 };
    const franja = { top: 460, bottom: 620, left: 100, right: 280 };
    const spots = [
      { element: { id: 'tarjeta' }, rect: tarjeta, bulto: tarjeta, soloArriba: false },
      { element: { id: 'franja' }, rect: franja, bulto: franja, soloArriba: true },
    ];

    const elegidos = new Set();
    for (let intento = 0; intento < 40; intento += 1) {
      const p = choosePlacement({ view: VIEW, scale: 1, spots, zones: [], avoidKey: null });
      elegidos.add(p.element ? p.element.id : 'pantalla');
      if (p.element) {
        expect(p.element.id).toBe('franja');
        expect(p.top + p.height).toBe(franja.top);
      }
    }
    expect(elegidos.has('franja')).toBe(true);
  });
});

describe('CuriousPeeker: apariciones', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('espera, se asoma un momento y se vuelve a esconder', () => {
    render(<CuriousPeeker pathname="/" />);
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();

    advanceToPeek(FIRST_WAIT);
    expect(screen.getByTestId('curious-peeker')).toHaveAttribute('data-beat', 'sale');

    advance(VISIBLE_FOR);
    expect(screen.getByTestId('curious-peeker')).toHaveAttribute('data-beat', 'escapa');

    advance(400);
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();
  });

  it('sale de golpe, se estira y se esconde, cada gesto con su tiempo', () => {
    render(<CuriousPeeker pathname="/" />);
    const peeker = () => screen.getByTestId('curious-peeker');
    const escondido = () => Number(peeker().firstChild.style.transform.match(/-?[\d.]+/)[0]);
    const alto = () => Number(peeker().style.height.replace('px', ''));

    advanceToPeek(FIRST_WAIT);
    const asomado = escondido();
    expect(asomado).toBeGreaterThan(0);
    expect(asomado).toBeLessThan(alto());

    // A media aparición se estira: queda menos escondido que al principio.
    advance(VISIBLE_FOR * 0.5);
    expect(peeker()).toHaveAttribute('data-beat', 'estira');
    expect(escondido()).toBeLessThan(asomado);

    // Y al final vuelve a meterse entero por debajo del canto.
    advance(VISIBLE_FOR * 0.5 + 50);
    expect(peeker()).toHaveAttribute('data-beat', 'escapa');
    expect(escondido()).toBeGreaterThan(asomado);
  });

  it('cada aparición arranca el vaivén en otro punto', () => {
    // Con Math.random fijo, la fase es estable y siempre negativa.
    render(<CuriousPeeker pathname="/" />);
    advanceToPeek(FIRST_WAIT);

    const art = screen.getByTestId('curious-peeker').querySelector('img');
    expect(art.style.getPropertyValue('--fase')).toMatch(/^-\d/);
    expect(['normal', 'reverse']).toContain(art.style.getPropertyValue('--mira'));
  });

  it('nunca hay dos a la vez en pantalla', () => {
    render(<CuriousPeeker pathname="/" />);

    // Tres ciclos completos: aparición, retirada y la siguiente aparición.
    for (let vuelta = 0; vuelta < 3; vuelta += 1) {
      advanceToPeek(vuelta === 0 ? FIRST_WAIT : GAP);
      expect(screen.getAllByTestId('curious-peeker')).toHaveLength(1);
      advance(VISIBLE_FOR + 400);
      expect(screen.queryAllByTestId('curious-peeker')).toHaveLength(0);
    }
  });

  it('también se asoma en el carrito y en Rocky IA', () => {
    for (const pathname of ['/cart', '/rockyIA']) {
      const { unmount } = render(<CuriousPeeker pathname={pathname} />);
      advance(FIRST_WAIT);
      expect(screen.getByTestId('curious-peeker')).toBeInTheDocument();
      unmount();
    }
  });

  it('espacia más las apariciones en móvil', () => {
    stubMedia('(max-width: 640px)');
    render(<CuriousPeeker pathname="/" />);

    advance(8_499);
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();

    advance(1);
    expect(screen.getByTestId('curious-peeker')).toBeInTheDocument();
  });

  it('no se monta durante el splash', () => {
    render(<CuriousPeeker pathname="/" disabled />);

    advance(60_000);
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();
  });

  it('desaparece con movimiento reducido', () => {
    stubMedia('(prefers-reduced-motion: reduce)');
    render(<CuriousPeeker pathname="/" />);

    advance(60_000);
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();
  });

  it('empieza de cero al cambiar de página', () => {
    const { rerender } = render(<CuriousPeeker pathname="/" />);

    advance(FIRST_WAIT);
    expect(screen.getByTestId('curious-peeker')).toBeInTheDocument();

    rerender(<CuriousPeeker pathname="/estudio" />);
    expect(screen.queryByTestId('curious-peeker')).not.toBeInTheDocument();

    advance(FIRST_WAIT);
    expect(screen.getByTestId('curious-peeker')).toBeInTheDocument();
  });

  it('es decorativo y no captura interacciones', () => {
    render(<CuriousPeeker pathname="/" />);
    advance(FIRST_WAIT);

    const peeker = screen.getByTestId('curious-peeker');
    expect(peeker).toHaveAttribute('aria-hidden', 'true');
    expect(peeker.querySelector('img')).toHaveAttribute('alt', '');
    expect(peeker.querySelector('img')).toHaveAttribute('draggable', 'false');
  });
});
