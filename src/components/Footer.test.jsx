import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Footer from './Footer';

let observers;

class ObserverFalso {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = [];
    observers.push(this);
  }

  observe(target) {
    this.observed.push(target);
  }

  disconnect() {
    this.disconnected = true;
  }
}

function setReducedMotion(enabled) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query) => ({
      matches: enabled && query === '(prefers-reduced-motion: reduce)',
    }))
  );
}

describe('Footer: patrulla de El Lata', () => {
  beforeEach(() => {
    observers = [];
    setReducedMotion(false);
    vi.stubGlobal('IntersectionObserver', ObserverFalso);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reserva la misma imagen, pero arranca con el póster ligero', () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const image = container.querySelector('.ticker-lata-image');
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('lata-spray-walk-seedance-poster-224.webp')
    );
    expect(image).toHaveAttribute('width', '166');
    expect(image).toHaveAttribute('height', '224');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(container.querySelector('.ticker-lata video')).not.toBeInTheDocument();

    expect(observers).toHaveLength(1);
    expect(observers[0].observed[0]).toHaveClass('ticker');
    expect(observers[0].options).toEqual({ rootMargin: '0px', threshold: 0 });
  });

  it('activa el WebP animado al acercarse al footer y deja de observar', () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    act(() => {
      observers[0].callback([{ isIntersecting: true }], observers[0]);
    });

    expect(container.querySelector('.ticker-lata-image')).toHaveAttribute(
      'src',
      expect.stringContaining('lata-spray-walk-seedance-224.webp')
    );
    expect(observers[0].disconnected).toBe(true);
  });

  it('mantiene siempre el póster cuando se pide movimiento reducido', () => {
    setReducedMotion(true);
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const image = container.querySelector('.ticker-lata-image');
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('lata-spray-walk-seedance-poster-224.webp')
    );
    const reducedMotionSource = container.querySelector(
      '.ticker-lata-picture source[media="(prefers-reduced-motion: reduce)"]'
    );
    expect(reducedMotionSource).toHaveAttribute(
      'srcset',
      expect.stringContaining('lata-spray-walk-seedance-poster-224.webp')
    );
    expect(observers).toHaveLength(0);
  });

  it('carga la animación directamente si el navegador no puede observar', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(container.querySelector('.ticker-lata-image')).toHaveAttribute(
      'src',
      expect.stringContaining('lata-spray-walk-seedance-224.webp')
    );
  });

  const renderFooter = () =>
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    ).container;
  const enPantalla = () =>
    act(() => {
      observers[0].callback([{ isIntersecting: true }], observers[0]);
    });
  const variantes = (image) =>
    image
      .getAttribute('srcset')
      .split(', ')
      .map((candidate) => candidate.replace(/^.*\/([^/]+?)(?:-[A-Za-z0-9_-]{8})?\.webp /, '$1 '));

  it('ofrece el póster en sus tres alturas mientras la cinta no está en pantalla', () => {
    const image = renderFooter().querySelector('.ticker-lata-image');

    expect(variantes(image)).toEqual([
      'lata-spray-walk-seedance-poster-h112 83w',
      'lata-spray-walk-seedance-poster-h168 125w',
      'lata-spray-walk-seedance-poster-224 166w',
    ]);
    expect(image).toHaveAttribute(
      'sizes',
      '(max-width: 840px) 62px, (max-width: 1100px) 7.4vw, 82px'
    );
  });

  it('con la cinta en pantalla ofrece la animación en sus tres alturas', () => {
    const container = renderFooter();
    enPantalla();

    expect(variantes(container.querySelector('.ticker-lata-image'))).toEqual([
      'lata-spray-walk-seedance-h112 83w',
      'lata-spray-walk-seedance-h168 125w',
      'lata-spray-walk-seedance-224 166w',
    ]);
  });

  it('con ahorro de datos se queda en el póster y ni siquiera observa', () => {
    vi.stubGlobal('navigator', { ...navigator, connection: { saveData: true } });
    const image = renderFooter().querySelector('.ticker-lata-image');

    expect(image.getAttribute('srcset')).toContain('poster');
    expect(image.getAttribute('src')).toContain('poster');
    expect(observers).toHaveLength(0);
  });

  it('al encender el neón con la cinta fuera de pantalla vuelve al póster, aunque ya se viera', async () => {
    const container = renderFooter();
    const image = container.querySelector('.ticker-lata-image');
    enPantalla();
    expect(image.getAttribute('src')).not.toContain('poster');

    // El cambio de tema llega por un MutationObserver, que avisa en una microtarea.
    await act(async () => {
      document.documentElement.dataset.theme = 'neon';
    });
    try {
      // Cambia el dibujo: se vuelve a esperar a que la cinta esté en pantalla.
      expect(image.getAttribute('src')).toContain('toxico-paseo-poster');
      expect(image.getAttribute('srcset')).toContain('poster');

      act(() => {
        observers.at(-1).callback([{ isIntersecting: true }], observers.at(-1));
      });
      expect(image.getAttribute('src')).toContain('toxico-paseo-224');
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

  it('de noche sigue las mismas reglas con el paseo de El Tóxico', () => {
    document.documentElement.dataset.theme = 'neon';
    try {
      const container = renderFooter();
      const image = container.querySelector('.ticker-lata-image');
      expect(variantes(image)).toEqual([
        'toxico-paseo-poster-h112 83w',
        'toxico-paseo-poster-h168 125w',
        'toxico-paseo-poster-224 166w',
      ]);

      enPantalla();
      expect(variantes(image)).toEqual([
        'toxico-paseo-h112 83w',
        'toxico-paseo-h168 125w',
        'toxico-paseo-224 166w',
      ]);
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

  it('la cinta anuncia el drop destacado con su fecha, sin drop fijo', () => {
    const anunciado = {
      handle: 'rocky-drop-6',
      number: 6,
      state: 'anunciado',
      launchAt: '2026-11-13T19:00:00Z',
    };
    const { container, rerender } = render(
      <MemoryRouter>
        <Footer featuredDrop={anunciado} />
      </MemoryRouter>
    );
    expect(container.querySelector('.ticker').textContent).toContain('DROP 6 · 13·11 · 20:00');
    expect(container.querySelector('.ticker').textContent).not.toContain('DROP 4');

    rerender(
      <MemoryRouter>
        <Footer featuredDrop={{ ...anunciado, state: 'en-la-calle' }} />
      </MemoryRouter>
    );
    expect(container.querySelector('.ticker').textContent).toContain('DROP 6 EN LA CALLE');

    rerender(
      <MemoryRouter>
        <Footer featuredDrop={null} />
      </MemoryRouter>
    );
    expect(container.querySelector('.ticker').textContent).not.toMatch(/DROP \d/);
  });
});

/* La Estampida también sale del pie (vida-a-la-vista): Los del Banco son un
   botón que llama a la crew con ratón, dedo o teclado. */
describe('Footer: llamar a la crew', () => {
  beforeEach(() => {
    observers = [];
    setReducedMotion(false);
    vi.stubGlobal('IntersectionObserver', ObserverFalso);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const pie = (props = {}) =>
    render(
      <MemoryRouter>
        <Footer {...props} />
      </MemoryRouter>
    );

  it('Los del Banco son un botón «Llamar a la crew» con su dibujo dentro', () => {
    pie();
    const boton = screen.getByRole('button', { name: 'Llamar a la crew' });

    expect(boton).toHaveAttribute('type', 'button');
    expect(boton.querySelector('img.footer-illustration')).not.toBeNull();
    // Sigue siendo un dibujo suelto para el Curioso, que no se asoma por un canto tapado.
    expect(boton).toHaveClass('doodle');
  });

  it('al pulsarlo con el ratón o el dedo llama a la crew', async () => {
    const onLlamada = vi.fn();
    pie({ onLlamada });

    await userEvent.click(screen.getByRole('button', { name: 'Llamar a la crew' }));

    expect(onLlamada).toHaveBeenCalledTimes(1);
  });

  it('con el teclado también, y el foco se queda en el botón', async () => {
    const onLlamada = vi.fn();
    pie({ onLlamada });
    const boton = screen.getByRole('button', { name: 'Llamar a la crew' });

    boton.focus();
    await userEvent.keyboard('{Enter}');

    expect(onLlamada).toHaveBeenCalledTimes(1);
    expect(boton).toHaveFocus();
  });

  it('sin nadie que escuche, pulsarlo no rompe nada', async () => {
    pie();

    await userEvent.click(screen.getByRole('button', { name: 'Llamar a la crew' }));

    expect(screen.getByRole('button', { name: 'Llamar a la crew' })).toBeInTheDocument();
  });
});

/* Lacoma (barrio-en-mapa): el pie abre el mapa del barrio en un diálogo. */
describe('Footer: el mapa de Lacoma', () => {
  beforeEach(() => {
    observers = [];
    setReducedMotion(false);
    vi.stubGlobal('IntersectionObserver', ObserverFalso);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const pie = () =>
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

  it('el botón abre el mapa en un diálogo, sin «tú estás aquí»', async () => {
    pie();

    await userEvent.click(screen.getByRole('button', { name: 'El mapa de Lacoma' }));

    const dialogo = await screen.findByRole('dialog', { name: 'El mapa de Lacoma' });
    expect(
      within(dialogo).getByRole('navigation', { name: 'El mapa de Lacoma' })
    ).toBeInTheDocument();
    expect(within(dialogo).queryByText(/Tú estás aquí/)).not.toBeInTheDocument();
  });

  it('«Cerrar el mapa» lo cierra y el foco vuelve al botón del pie', async () => {
    pie();
    const boton = screen.getByRole('button', { name: 'El mapa de Lacoma' });
    await userEvent.click(boton);
    const dialogo = await screen.findByRole('dialog', { name: 'El mapa de Lacoma' });

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar el mapa' }));

    expect(screen.queryByRole('dialog', { name: 'El mapa de Lacoma' })).not.toBeInTheDocument();
    expect(boton).toHaveFocus();
  });

  it('Escape también lo cierra y el foco vuelve al botón', async () => {
    pie();
    const boton = screen.getByRole('button', { name: 'El mapa de Lacoma' });
    await userEvent.click(boton);
    const dialogo = await screen.findByRole('dialog', { name: 'El mapa de Lacoma' });

    fireEvent(dialogo, new Event('cancel', { cancelable: true }));

    expect(screen.queryByRole('dialog', { name: 'El mapa de Lacoma' })).not.toBeInTheDocument();
    expect(boton).toHaveFocus();
  });

  // Safari no enfoca un botón al pulsarlo con el ratón: el foco vuelve igual.
  it('el foco vuelve al botón aunque el clic no lo enfocara', async () => {
    pie();
    const boton = screen.getByRole('button', { name: 'El mapa de Lacoma' });
    fireEvent.click(boton);
    const dialogo = await screen.findByRole('dialog', { name: 'El mapa de Lacoma' });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar el mapa' }));

    expect(boton).toHaveFocus();
  });

  it('pulsar un sitio cierra el mapa y abre su sección, sin devolver el foco al pie', async () => {
    const Ruta = () => <p data-testid="ruta">{useLocation().pathname}</p>;
    render(
      <MemoryRouter>
        <Footer />
        <Ruta />
      </MemoryRouter>
    );
    const boton = screen.getByRole('button', { name: 'El mapa de Lacoma' });
    await userEvent.click(boton);
    const dialogo = await screen.findByRole('dialog', { name: 'El mapa de Lacoma' });

    await userEvent.click(within(dialogo).getByRole('link', { name: /El callejón/ }));

    expect(screen.queryByRole('dialog', { name: 'El mapa de Lacoma' })).not.toBeInTheDocument();
    expect(screen.getByTestId('ruta')).toHaveTextContent('/menudrop');
    expect(boton).not.toHaveFocus();
  });
});
