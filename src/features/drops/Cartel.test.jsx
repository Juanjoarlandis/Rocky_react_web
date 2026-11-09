import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Cartel from './Cartel';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const serverNow = () => Date.now();

const base = {
  handle: 'rocky-drop-6',
  number: 6,
  title: 'ROCKY DROP 6',
  tagline: 'Cae dentro de poco',
  story: '',
  poster: { url: 'https://cdn.shopify.com/cartel-6.png', alt: 'Cartel del Drop 6' },
  launchAt: '2026-11-13T19:00:00Z',
  endsAt: null,
  state: 'anunciado',
  designCount: 5,
  designs: null,
  soldOut: false,
};

const products = [
  {
    handle: 'rocky-sin-frenos',
    title: 'Sin frenos',
    image: 'https://cdn.shopify.com/a.png',
    imageAlt: 'Sin frenos',
  },
  {
    handle: 'rocky-descontrol',
    title: 'Descontrol',
    image: 'https://cdn.shopify.com/b.png',
    imageAlt: 'Descontrol',
  },
];

function renderCartel(drop, props = {}) {
  return render(
    <MemoryRouter>
      <Cartel drop={drop} products={products} serverNow={serverNow} {...props} />
    </MemoryRouter>
  );
}

describe('Cartel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('anunciado: tapado con cinta, fecha de Madrid, cuenta atrás y siluetas, sin nombres', () => {
    const { container } = renderCartel(base);
    const cartel = screen.getByRole('article', { name: 'ROCKY DROP 6' });
    expect(cartel).toHaveClass('cartel--anunciado');
    expect(container.querySelectorAll('.cartel-cinta')).toHaveLength(2);
    expect(
      within(cartel).getByText('Sale el viernes 13 de noviembre a las 20:00, hora de Madrid.')
    ).toBeInTheDocument();
    expect(container.querySelector('.cuenta')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.cartel-silueta')).toHaveLength(5);
    expect(within(cartel).getByText('Próximamente')).toBeInTheDocument();
    expect(cartel.textContent).not.toMatch(/Sin frenos|Descontrol/);
    expect(within(cartel).queryByRole('link', { name: /entrar al drop/i })).toBeNull();
  });

  it('con muchos diseños enseña seis siluetas y cuántos más hay', () => {
    const { container } = renderCartel({ ...base, designCount: 9 });
    expect(container.querySelectorAll('.cartel-silueta')).toHaveLength(6);
    expect(container.querySelector('.cartel-silueta-mas')).toHaveTextContent('+3');
    expect(screen.getByText('9 diseños bajo llave')).toBeInTheDocument();
  });

  it('la cuenta atrás va con la hora corregida del servidor', () => {
    const { container } = renderCartel(base, { serverNow: () => Date.now() - 10 * 60_000 });
    // Con el servidor 10 minutos por detrás faltan 3 d 7 h 10 min, no 3 d 7 h 0 min.
    expect(container.querySelector('.cuenta').textContent).toMatch(/03d.*07h.*10m/);
  });

  it('en la calle: sello, miniaturas de sus diseños y enlace al drop', () => {
    const drop = {
      ...base,
      launchAt: '2026-11-01T19:00:00Z',
      state: 'en-la-calle',
      designs: ['rocky-sin-frenos', 'rocky-descontrol'],
    };
    const { container } = renderCartel(drop);
    const cartel = screen.getByRole('article', { name: 'ROCKY DROP 6' });
    expect(cartel).toHaveClass('cartel--en-la-calle');
    expect(container.querySelector('.cartel-sello')).toHaveTextContent('Ya en la calle');
    expect(container.querySelectorAll('.cartel-miniaturas img')).toHaveLength(2);
    expect(within(cartel).getByRole('link', { name: /entrar al drop/i })).toHaveAttribute(
      'href',
      '/products/rocky-drop-6'
    );
    expect(container.querySelector('.cartel-cinta')).toBeNull();
  });

  it('últimas horas: esquina despegada y lo que queda', () => {
    const drop = {
      ...base,
      launchAt: '2026-11-01T19:00:00Z',
      endsAt: '2026-11-11T18:00:00Z',
      state: 'ultimas-horas',
      designs: [],
    };
    const { container } = renderCartel(drop);
    expect(screen.getByRole('article')).toHaveClass('cartel--ultimas-horas');
    expect(container.querySelector('.cartel-esquina')).not.toBeNull();
    expect(screen.getByText(/Últimas horas · quedan 30 h/)).toBeInTheDocument();
  });

  it('archivo: roto, «Voló» y enlace al archivo', () => {
    const drop = {
      ...base,
      launchAt: '2026-09-01T19:00:00Z',
      endsAt: '2026-09-08T19:00:00Z',
      state: 'archivo',
      designs: [],
    };
    const { container } = renderCartel(drop);
    expect(screen.getByRole('article')).toHaveClass('cartel--archivo');
    expect(container.querySelector('.cartel-sello--volo')).toHaveTextContent('Voló');
    expect(screen.getByRole('link', { name: /ver el archivo/i })).toHaveAttribute(
      'href',
      '/products/rocky-drop-6'
    );
  });

  it('sin imagen de cartel compone uno tipográfico con el número', () => {
    const { container } = renderCartel({ ...base, poster: null });
    expect(container.querySelector('.cartel-tipo')).toHaveTextContent('6');
    expect(container.querySelector('.cartel-arte')).toBeNull();
  });

  it('al llegar la hora cambia a «en la calle» sin esperar al servidor', () => {
    const drop = { ...base, launchAt: new Date(NOW + 20_000).toISOString() };
    renderCartel(drop);
    expect(screen.getByRole('article')).toHaveClass('cartel--anunciado');
    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(screen.getByRole('article')).toHaveClass('cartel--en-la-calle');
  });

  it('cada drop lleva siempre su mismo giro', () => {
    const { container, unmount } = renderCartel(base);
    const giro = container.querySelector('.cartel').style.getPropertyValue('--giro');
    unmount();
    const again = renderCartel(base);
    expect(again.container.querySelector('.cartel').style.getPropertyValue('--giro')).toBe(giro);
  });
});

describe('Pestañas de aviso del cartel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('son botones con nombre que abren el aviso del drop con el foco en el email', () => {
    renderCartel(base);
    const pestanas = screen.getAllByRole('button', {
      name: 'Avísame cuando caiga el ROCKY DROP 6',
    });
    expect(pestanas.length).toBeGreaterThanOrEqual(4);
    pestanas[0].focus();
    fireEvent.click(pestanas[0]);
    expect(pestanas[0]).toHaveClass('is-torn');
    const email = screen.getByRole('textbox', { name: 'Tu email para el aviso del drop' });
    expect(email).toHaveFocus();
    expect(pestanas[0]).toHaveAttribute('aria-expanded', 'true');
  });

  it('solo una pestaña entra en el tabulador: las demás siguen ahí para el ratón', () => {
    renderCartel(base);
    const pestanas = screen.getAllByRole('button', {
      name: 'Avísame cuando caiga el ROCKY DROP 6',
    });
    expect(pestanas.filter((p) => p.tabIndex === 0)).toHaveLength(1);
    fireEvent.click(pestanas[0]);
    // La arrancada desaparece: el turno del tabulador pasa a la siguiente.
    const enTurno = pestanas.filter((p) => p.tabIndex === 0);
    expect(enTurno).toHaveLength(1);
    expect(enTurno[0]).not.toBe(pestanas[0]);
  });

  it('arrancar otra pestaña con el aviso ya abierto vuelve a llevar el foco al email', () => {
    renderCartel(base);
    const pestanas = screen.getAllByRole('button', {
      name: 'Avísame cuando caiga el ROCKY DROP 6',
    });
    fireEvent.click(pestanas[0]);
    const email = screen.getByRole('textbox', { name: 'Tu email para el aviso del drop' });
    pestanas[1].focus();
    fireEvent.click(pestanas[1]);
    expect(email).toHaveFocus();
  });

  it('si ya estaba apuntado, el foco va al aviso y no se pierde', () => {
    window.localStorage.setItem('rocky-aviso-rocky-drop-6', '1');
    try {
      renderCartel(base);
      const [pestana] = screen.getAllByRole('button', {
        name: 'Avísame cuando caiga el ROCKY DROP 6',
      });
      pestana.focus();
      fireEvent.click(pestana);
      expect(screen.getByTestId('drop-aviso-listo').closest('.pestanas-aviso')).toHaveFocus();
    } finally {
      window.localStorage.removeItem('rocky-aviso-rocky-drop-6');
    }
  });
});
