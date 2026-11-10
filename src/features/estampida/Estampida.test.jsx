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
