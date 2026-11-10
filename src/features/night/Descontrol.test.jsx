import { act, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Descontrol, { AWAY_TITLE } from './Descontrol.jsx';

afterEach(() => {
  delete document.documentElement.dataset.theme;
  vi.useRealTimers();
});

describe('Modo descontrol: la pared de luz negra', () => {
  it('de día no pinta nada', () => {
    render(<Descontrol pathname="/" />);
    expect(screen.queryByTestId('uv-wall')).not.toBeInTheDocument();
  });

  it('llegar ya de noche enciende la pared sin apagón', () => {
    document.documentElement.dataset.theme = 'neon';
    render(<Descontrol pathname="/" />);
    expect(screen.getByTestId('uv-wall')).toBeInTheDocument();
    expect(screen.queryByTestId('descontrol-flash')).not.toBeInTheDocument();
  });

  it('pulsar la bombilla trae el apagón con el rótulo, y se retira solo', async () => {
    vi.useFakeTimers();
    render(<Descontrol pathname="/" />);
    await act(async () => {
      document.documentElement.dataset.theme = 'neon';
    });
    expect(screen.getByTestId('descontrol-flash')).toHaveTextContent('Descontrol activado');
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.queryByTestId('descontrol-flash')).not.toBeInTheDocument();
    expect(screen.getByTestId('uv-wall')).toBeInTheDocument();
  });

  // El spray llega en su propio chunk (carga-y-estabilidad): se espera.
  it('de noche hay oscuridad que crece con el scroll y bote de spray', async () => {
    document.documentElement.dataset.theme = 'neon';
    render(<Descontrol pathname="/crew" />);
    expect(screen.getByTestId('uv-oscuridad')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Coge el spray' })).toBeInTheDocument();
  });

  describe('la linterna mueve capas, no repinta la pantalla', () => {
    const capas = () => ({
      pared: screen.getByTestId('uv-wall'),
      haz: document.querySelector('.uv-torch'),
      ventana: document.querySelector('.uv-ink-window'),
      tinta: document.querySelector('.uv-ink'),
      tenue: document.querySelector('.uv-ink-tenue'),
      oscuridad: screen.getByTestId('uv-oscuridad'),
      luz: document.querySelector('.uv-oscuridad-luz'),
    });
    const mover = async (x, y) => {
      await act(async () => {
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }));
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
    };

    afterEach(() => {
      vi.unstubAllGlobals();
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        configurable: true,
        value: 0,
      });
    });

    it('al mover el puntero solo cambian transformaciones: ni variables ni degradados', async () => {
      document.documentElement.dataset.theme = 'neon';
      render(<Descontrol pathname="/crew" />);
      await mover(120, 80);
      const { pared, haz, ventana, tinta, oscuridad, luz } = capas();

      expect(haz.style.transform).toBe('translate3d(120px, 80px, 0) scale(1)');
      expect(luz.style.transform).toBe('translate3d(120px, 80px, 0) scale(1)');
      expect(ventana.style.transform).toBe('translate3d(120px, 80px, 0) scale(1)');
      // La tinta deshace el viaje de su ventana: se queda en su sitio de la página
      expect(tinta.style.transform).toBe('scale(1) translate3d(-120px, -80px, 0)');
      for (const capa of [pared, oscuridad, haz, ventana, luz]) {
        expect(capa.style.getPropertyValue('--tx')).toBe('');
        expect(capa.style.getPropertyValue('--ty')).toBe('');
      }
    });

    it('al bajar, el haz se estrecha con una escala y la noche se hace honda con la opacidad', async () => {
      document.documentElement.dataset.theme = 'neon';
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        configurable: true,
        value: window.innerHeight + 1000,
      });
      render(<Descontrol pathname="/crew" />);
      await mover(200, 100);
      await act(async () => {
        vi.stubGlobal('scrollY', 500);
        window.dispatchEvent(new Event('scroll'));
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
      const { haz, ventana, tinta, tenue, oscuridad, luz } = capas();

      // Media página: el haz al 82,5 % y la oscuridad a 0,08 + 0,34 × 0,5
      expect(haz.style.transform).toBe('translate3d(200px, 100px, 0) scale(0.825)');
      expect(luz.style.transform).toBe('translate3d(200px, 100px, 0) scale(0.825)');
      expect(ventana.style.transform).toBe('translate3d(200px, 100px, 0) scale(0.825)');
      expect(Number(luz.style.opacity)).toBeCloseTo(0.25, 3);
      expect(oscuridad.style.opacity).toBe('');
      // Fuera del haz queda la copia tenue, que va con la página: nadie la mueve
      expect(tenue.style.transform).toBe('');
      expect(tenue.children).toHaveLength(tinta.children.length);
      // La tinta sube con la página y deshace también la escala de su ventana
      const [, escala, x, y] =
        /scale\(([\d.]+)\) translate3d\((-?[\d.]+)px, (-?[\d.]+)px, 0\)/.exec(
          tinta.style.transform
        );
      expect(Number(escala) * 0.825).toBeCloseTo(1, 3);
      expect([Number(x), Number(y)]).toEqual([-200, -600]);
    });
  });

  it('en el chat no hay pared ni spray', async () => {
    document.documentElement.dataset.theme = 'neon';
    // Con el spray ya cargado (lo trae la página anterior), en el chat no sale
    const { rerender } = render(<Descontrol pathname="/crew" />);
    await screen.findByRole('button', { name: 'Coge el spray' });
    rerender(<Descontrol pathname="/rockyIA" />);
    await act(async () => {});
    expect(screen.queryByRole('button', { name: 'Coge el spray' })).not.toBeInTheDocument();
  });

  it('al coger el spray aparecen los colores y se puede soltar con Escape', async () => {
    document.documentElement.dataset.theme = 'neon';
    render(<Descontrol pathname="/" />);
    const bote = await screen.findByRole('button', { name: 'Coge el spray' });
    await act(async () => {
      bote.click();
    });
    expect(screen.getByRole('radio', { name: 'Lima' })).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement).toHaveClass('is-spraying');
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(screen.getByRole('button', { name: 'Coge el spray' })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('is-spraying');
  });

  it('si te vas de la pestaña, la crew te sigue mirando', async () => {
    document.documentElement.dataset.theme = 'neon';
    document.title = 'La Crew · ROCKY 035';
    let hidden = false;
    const spy = vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    render(<Descontrol pathname="/crew" />);

    hidden = true;
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(document.title).toBe(AWAY_TITLE);

    hidden = false;
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(document.title).toBe('La Crew · ROCKY 035');
    spy.mockRestore();
  });

  it('durante el splash no hay pared', () => {
    document.documentElement.dataset.theme = 'neon';
    render(<Descontrol pathname="/" disabled />);
    expect(screen.queryByTestId('uv-wall')).not.toBeInTheDocument();
  });
});

/* Encender el descontrol con la bombilla acaba en la portada: Descontrol avisa
   cuando termina el rótulo y App decide la navegación. */
describe('Modo descontrol: aviso para ir a la portada', () => {
  afterEach(() => vi.restoreAllMocks());

  const enciende = () =>
    act(async () => {
      document.documentElement.dataset.theme = 'neon';
    });

  /* Decisión del usuario (2026-11-09): se cambia de página bajo la tinta, con
     la pantalla tapada, para que al retirarse el rótulo ya asome la portada
     y no se vea otra vez la página de partida. */
  it('avisa con la pantalla tapada por la tinta, antes de que se retire el rótulo', async () => {
    vi.useFakeTimers();
    const onActivated = vi.fn();
    render(<Descontrol pathname="/estudio" onActivated={onActivated} />);
    await enciende();
    expect(screen.getByTestId('descontrol-flash')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(onActivated).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    expect(onActivated).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('descontrol-flash')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(onActivated).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('descontrol-flash')).not.toBeInTheDocument();
  });

  it('si se apaga antes de que la tinta tape la pantalla, no avisa', async () => {
    vi.useFakeTimers();
    const onActivated = vi.fn();
    render(<Descontrol pathname="/estudio" onActivated={onActivated} />);
    await enciende();
    await act(async () => {
      vi.advanceTimersByTime(200);
      delete document.documentElement.dataset.theme;
    });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByTestId('descontrol-flash')).not.toBeInTheDocument();
    expect(onActivated).not.toHaveBeenCalled();
  });

  it('con movimiento reducido no hay rótulo y avisa al encender', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const onActivated = vi.fn();
    render(<Descontrol pathname="/estudio" onActivated={onActivated} />);
    await enciende();
    expect(screen.queryByTestId('descontrol-flash')).not.toBeInTheDocument();
    expect(onActivated).toHaveBeenCalledTimes(1);
  });

  it('llegar ya de noche no avisa', async () => {
    vi.useFakeTimers();
    document.documentElement.dataset.theme = 'neon';
    const onActivated = vi.fn();
    render(<Descontrol pathname="/estudio" onActivated={onActivated} />);
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(onActivated).not.toHaveBeenCalled();
  });
});

/* Idea 5 de dirección artística: rotulador para entrar en la noche y corrector
   para salir (cambio punto-de-mira-tippex-y-pegatinas). */
describe('Modo descontrol: rotulador y Tipp-Ex', () => {
  afterEach(() => vi.restoreAllMocks());

  const reducedMotion = () =>
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

  it('al encender, el rotulador tapa la pantalla antes del rótulo', async () => {
    vi.useFakeTimers();
    render(<Descontrol pathname="/" />);
    await act(async () => {
      document.documentElement.dataset.theme = 'neon';
    });
    const flash = screen.getByTestId('descontrol-flash');
    expect(flash.querySelector('svg.mode-stroke--marker path[pathLength="1"]')).not.toBeNull();
    expect(flash).toHaveTextContent('Descontrol activado');
  });

  it('al apagar, el corrector borra la noche y se va a los 0,7 s', async () => {
    vi.useFakeTimers();
    document.documentElement.dataset.theme = 'neon';
    render(<Descontrol pathname="/" />);
    expect(screen.queryByTestId('descontrol-tippex')).not.toBeInTheDocument();

    await act(async () => {
      delete document.documentElement.dataset.theme;
    });
    const tippex = screen.getByTestId('descontrol-tippex');
    expect(tippex).toHaveAttribute('aria-hidden', 'true');
    expect(tippex.querySelector('svg.mode-stroke--tippex path[pathLength="1"]')).not.toBeNull();
    // La noche es un rectángulo con máscara: los brochazos le abren agujeros por
    // los que se ve el día de verdad, y el borde blanco es el corrector.
    const svg = tippex.querySelector('svg.mode-stroke--tippex');
    const mask = svg.querySelector('mask');
    expect(mask.querySelector('rect')).not.toBeNull();
    expect(mask.querySelector('path[pathLength="1"]')).not.toBeNull();
    expect(svg.querySelector(`g[mask="url(#${mask.id})"] rect.mode-stroke-night`)).not.toBeNull();
    expect(svg.querySelector(`g[mask="url(#${mask.id})"] path.mode-stroke-rim`)).not.toBeNull();
    // Un filo de tinta entre el corrector y el día: blanco sobre crema no se ve.
    expect(svg.querySelector(`g[mask="url(#${mask.id})"] path.mode-stroke-edge`)).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(650);
    });
    expect(screen.getByTestId('descontrol-tippex')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByTestId('descontrol-tippex')).not.toBeInTheDocument();
  });

  /* Apagar con la tinta ya puesta: la navegación ya ha ocurrido (decisión del
     usuario), así que se queda en la portada, de día, y sale el corrector. */
  it('apagar después de que la tinta tape la pantalla deja la portada y saca el corrector', async () => {
    vi.useFakeTimers();
    const onActivated = vi.fn();
    render(<Descontrol pathname="/estudio" onActivated={onActivated} />);
    await act(async () => {
      document.documentElement.dataset.theme = 'neon';
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(onActivated).toHaveBeenCalledTimes(1);
    await act(async () => {
      delete document.documentElement.dataset.theme;
    });
    expect(screen.queryByTestId('descontrol-flash')).not.toBeInTheDocument();
    expect(screen.getByTestId('descontrol-tippex')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(onActivated).toHaveBeenCalledTimes(1);
  });

  it('volver a encender durante el borrado lo quita y empieza el encendido', async () => {
    vi.useFakeTimers();
    document.documentElement.dataset.theme = 'neon';
    render(<Descontrol pathname="/" />);
    await act(async () => {
      delete document.documentElement.dataset.theme;
    });
    expect(screen.getByTestId('descontrol-tippex')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(300);
      document.documentElement.dataset.theme = 'neon';
    });
    expect(screen.queryByTestId('descontrol-tippex')).not.toBeInTheDocument();
    expect(screen.getByTestId('descontrol-flash')).toBeInTheDocument();
  });

  it('con movimiento reducido no hay corrector ni rotulador', async () => {
    reducedMotion();
    document.documentElement.dataset.theme = 'neon';
    render(<Descontrol pathname="/" />);
    await act(async () => {
      delete document.documentElement.dataset.theme;
    });
    expect(screen.queryByTestId('descontrol-tippex')).not.toBeInTheDocument();
    await act(async () => {
      document.documentElement.dataset.theme = 'neon';
    });
    expect(screen.queryByTestId('descontrol-flash')).not.toBeInTheDocument();
  });

  it('el rótulo no se enciende hasta que el rotulador ha tapado la pantalla', () => {
    const css = readFileSync('src/styles/components/descontrol.css', 'utf8');
    // La capa empieza siendo papel de día (el tema ya es de noche): el rotulador
    // de tinta se ve al tapar, en vez de negro sobre negro.
    expect(css).toMatch(/\.descontrol-flash \{[^}]*background-color: rgb\(var\(--paper-rgb\)\);/);
    expect(css).toMatch(/\.mode-stroke--marker path \{[^}]*stroke: rgb\(var\(--ink-rgb\)\);/);
    // El rotulador termina de tapar al 28 % de los 1,4 s (392 ms)…
    expect(css).toMatch(/\.mode-stroke--marker path \{[^}]*animation: mode-stroke-marker 1\.4s/);
    expect(css).toMatch(
      /@keyframes mode-stroke-marker \{[^@]*28%,\s*100% \{\s*stroke-dashoffset: 0;/
    );
    // …y el rótulo sigue apagado hasta entonces.
    expect(css).toMatch(/@keyframes rotulo-enciende \{\s*0%,\s*29% \{\s*opacity: 0;/);
    // Bajo la tinta ya está la portada: el rótulo se va antes de que asome su
    // titular, para no cruzarse con él.
    expect(css).toMatch(/@keyframes rotulo-enciende \{[^@]*88%,\s*100% \{\s*opacity: 0;/);
    // El corrector dura 0,7 s, igual que su capa en Descontrol.
    expect(css).toMatch(/\.descontrol-tippex \{[^}]*animation: descontrol-tippex-fade 0\.7s/);
    expect(css).toMatch(/\.mode-stroke--tippex path \{[^}]*animation: mode-stroke-tippex 0\.7s/);
  });
});

/* La pieza se carga aparte (carga-y-estabilidad): si la bombilla se pulsa antes
   de que llegue su chunk, al montarse ya es de noche y tiene que anunciarlo. */
describe('Modo descontrol: montado después de pulsar la bombilla', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete document.documentElement.dataset.theme;
  });

  it('con announceIfNight, llegar de noche trae el apagón y avisa a la portada', async () => {
    vi.useFakeTimers();
    document.documentElement.dataset.theme = 'neon';
    const onActivated = vi.fn();

    render(<Descontrol pathname="/estudio" onActivated={onActivated} announceIfNight />);

    expect(screen.getByTestId('descontrol-flash')).toHaveTextContent('Descontrol activado');
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(onActivated).toHaveBeenCalledTimes(1);
  });

  it('con announceIfNight y de día no anuncia nada', () => {
    render(<Descontrol pathname="/" announceIfNight />);

    expect(screen.queryByTestId('descontrol-flash')).not.toBeInTheDocument();
  });
});
