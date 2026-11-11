import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Estampida from './Estampida.jsx';

function teclea(keys, target = window) {
  for (const key of keys) fireEvent.keyDown(target, { key });
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('Estampida 035', () => {
  it('teclear 035 suelta a toda la crew, y se van solos', async () => {
    vi.useFakeTimers();
    render(<Estampida />);
    teclea(['0', '3', '5']);
    // Espera a tener las imágenes (en jsdom, al momento).
    await act(async () => {});
    const estampida = screen.getByTestId('estampida');
    expect(estampida.querySelectorAll('.estampida-corredor').length).toBeGreaterThan(15);
    expect(screen.getByText('¡Estampida!')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.queryByTestId('estampida')).not.toBeInTheDocument();
  });

  it('otras teclas, o 035 dentro de un campo de texto, no hacen nada', async () => {
    render(
      <>
        <input aria-label="Código postal" />
        <Estampida />
      </>
    );
    teclea(['0', '3', '4']);
    expect(screen.queryByTestId('estampida')).not.toBeInTheDocument();
    teclea(['0', '3', '5'], screen.getByLabelText('Código postal'));
    await act(async () => {});
    expect(screen.queryByTestId('estampida')).not.toBeInTheDocument();
  });

  it('durante el splash no corre nadie', () => {
    render(<Estampida disabled />);
    teclea(['0', '3', '5']);
    expect(screen.queryByTestId('estampida')).not.toBeInTheDocument();
  });
});

describe('Estampida: qué dibujos descarga', () => {
  it('precarga y pinta la variante pequeña de cada corredor, no el original', async () => {
    const pedidas = [];
    class ImagenFalsa {
      set src(value) {
        pedidas.push(value);
      }
    }
    vi.stubGlobal('Image', ImagenFalsa);
    try {
      render(<Estampida />);
      teclea(['0', '3', '5']);
      await act(async () => {});

      expect(pedidas.length).toBeGreaterThan(15);
      expect(pedidas.filter((src) => /-hd\.webp/.test(src))).toEqual([]);
      expect(pedidas.filter((src) => /-h320\.webp/.test(src)).length).toBeGreaterThan(15);
      const pintadas = [...screen.getByTestId('estampida').querySelectorAll('img')].map((img) =>
        img.getAttribute('src')
      );
      expect(pintadas.filter((src) => /-hd\.webp/.test(src))).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

/* La escucha de «035» vive en App (carga-y-estabilidad): la pieza se carga
   aparte y arranca cuando App le sube la señal. */
describe('Estampida lanzada desde fuera', () => {
  it('con una señal nueva suelta a la crew', async () => {
    const { rerender } = render(<Estampida listen={false} launchSignal={0} />);
    expect(screen.queryByTestId('estampida')).not.toBeInTheDocument();

    rerender(<Estampida listen={false} launchSignal={1} />);
    await act(async () => {});

    expect(screen.getByTestId('estampida')).toBeInTheDocument();
  });

  // Llamar otra vez (vida-a-la-vista): el pie y la caída de un drop suben la
  // misma señal que «035». Con el azar fijo la carrera dura ~4,6 s: si la
  // segunda señal la relanzara, seguiría en pantalla hasta los ~6,6 s.
  it('una señal mientras la crew cruza no la relanza; una posterior, sí', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      const { rerender } = render(<Estampida listen={false} launchSignal={1} />);
      await act(async () => {});
      expect(screen.getByTestId('estampida')).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(2000));
      rerender(<Estampida listen={false} launchSignal={2} />);
      await act(async () => {});
      act(() => vi.advanceTimersByTime(2700));
      expect(screen.queryByTestId('estampida')).not.toBeInTheDocument();

      rerender(<Estampida listen={false} launchSignal={3} />);
      await act(async () => {});
      expect(screen.getByTestId('estampida')).toBeInTheDocument();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('si se monta con la señal ya dada, arranca', async () => {
    render(<Estampida listen={false} launchSignal={1} />);
    await act(async () => {});

    expect(screen.getByTestId('estampida')).toBeInTheDocument();
  });

  it('una señal ya atendida no vuelve a soltarla al cambiar de tema', async () => {
    vi.useFakeTimers();
    try {
      render(<Estampida listen={false} launchSignal={1} />);
      await act(async () => {});
      expect(screen.getByTestId('estampida')).toBeInTheDocument();
      // La estampida termina sola…
      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });
      expect(screen.queryByTestId('estampida')).not.toBeInTheDocument();

      // …y pulsar la bombilla después no es teclear «035» otra vez.
      await act(async () => {
        document.documentElement.dataset.theme = 'neon';
      });
      await act(async () => {});
      expect(screen.queryByTestId('estampida')).not.toBeInTheDocument();
    } finally {
      delete document.documentElement.dataset.theme;
      vi.useRealTimers();
    }
  });

  it('sin escucha propia no responde al teclado', async () => {
    render(<Estampida listen={false} launchSignal={0} />);
    teclea(['0', '3', '5']);
    await act(async () => {});

    expect(screen.queryByTestId('estampida')).not.toBeInTheDocument();
  });
});

describe('secuencia secreta', () => {
  it('avisa al completar 035 y no dentro de un campo de texto ni con modificadores', async () => {
    const { listenForSecret } = await import('./secret.js');
    const onMatch = vi.fn();
    const stop = listenForSecret(onMatch);
    render(<input aria-label="Código postal" />);

    teclea(['0', '3', '4', '0', '3', '5']);
    expect(onMatch).toHaveBeenCalledTimes(1);
    teclea(['0', '3', '5'], screen.getByLabelText('Código postal'));
    fireEvent.keyDown(window, { key: '0' });
    fireEvent.keyDown(window, { key: '3', ctrlKey: true });
    fireEvent.keyDown(window, { key: '5' });
    expect(onMatch).toHaveBeenCalledTimes(1);

    stop();
    teclea(['0', '3', '5']);
    expect(onMatch).toHaveBeenCalledTimes(1);
  });
});
