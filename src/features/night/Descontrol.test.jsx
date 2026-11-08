import { act, render, screen } from '@testing-library/react';
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

  it('de noche hay oscuridad que crece con el scroll y bote de spray', () => {
    document.documentElement.dataset.theme = 'neon';
    render(<Descontrol pathname="/crew" />);
    expect(screen.getByTestId('uv-oscuridad')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coge el spray' })).toBeInTheDocument();
  });

  it('en el chat no hay pared ni spray', () => {
    document.documentElement.dataset.theme = 'neon';
    render(<Descontrol pathname="/rockyIA" />);
    expect(screen.queryByRole('button', { name: 'Coge el spray' })).not.toBeInTheDocument();
  });

  it('al coger el spray aparecen los colores y se puede soltar con Escape', async () => {
    document.documentElement.dataset.theme = 'neon';
    render(<Descontrol pathname="/" />);
    await act(async () => {
      screen.getByRole('button', { name: 'Coge el spray' }).click();
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

  it('avisa cuando termina el rótulo, no antes', async () => {
    vi.useFakeTimers();
    const onActivated = vi.fn();
    render(<Descontrol pathname="/estudio" onActivated={onActivated} />);
    await enciende();
    expect(screen.getByTestId('descontrol-flash')).toBeInTheDocument();
    expect(onActivated).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(onActivated).toHaveBeenCalledTimes(1);
  });

  it('si se apaga a mitad del rótulo, no avisa', async () => {
    vi.useFakeTimers();
    const onActivated = vi.fn();
    render(<Descontrol pathname="/estudio" onActivated={onActivated} />);
    await enciende();
    await act(async () => {
      vi.advanceTimersByTime(500);
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
