import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribeTorch } from './torch.js';

afterEach(() => vi.useRealTimers());

describe('La linterna', () => {
  it('da su posición al engancharse y sigue al puntero, una vez por fotograma', async () => {
    const seen = [];
    const release = subscribeTorch((position) => seen.push({ ...position }));
    expect(seen).toHaveLength(1);

    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 20 }));
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 30, clientY: 40 }));
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(seen.at(-1)).toEqual({ x: 30, y: 40 });
    expect(seen).toHaveLength(2);

    release();
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 50, clientY: 60 }));
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(seen).toHaveLength(2);
  });

  it('con el teclado apunta al elemento con el foco', async () => {
    const button = document.createElement('button');
    document.body.append(button);
    button.getBoundingClientRect = () => ({ left: 100, top: 200, width: 40, height: 20 });
    const seen = [];
    const release = subscribeTorch((position) => seen.push({ ...position }));
    button.focus();
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(seen.at(-1)).toEqual({ x: 120, y: 210 });
    release();
    button.remove();
  });
});
