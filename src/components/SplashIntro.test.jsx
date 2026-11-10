import { renderHook, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SplashIntro from './SplashIntro.jsx';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll.js';

describe('SplashIntro: bloqueo de scroll', () => {
  it('bloquea la página mientras está y la libera al irse', () => {
    const { unmount } = render(<SplashIntro />);
    expect(document.documentElement.style.overflow).toBe('hidden');
    unmount();
    expect(document.documentElement.style.overflow).toBe('');
  });

  /* H-010: el menú abierto durante la intro y cerrado después dejaba la página
     sin scroll, porque cada bloqueo restauraba lo que vio al entrar. */
  it('con el menú abierto durante la intro, la página se libera al cerrarse los dos', () => {
    const intro = render(<SplashIntro />);
    const menu = renderHook(({ on }) => useLockBodyScroll(on), { initialProps: { on: true } });
    intro.unmount();
    expect(document.documentElement.style.overflow).toBe('hidden');
    menu.rerender({ on: false });
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
    menu.unmount();
  });
});

/* La intro tapa la página mientras esta carga: sus dieciséis ilustraciones
   compiten por la red con los datos de la tienda. En un móvil se pintan a
   menos de la mitad del tamaño del fichero, así que llevan una variante a la
   mitad (343 kB → 96 kB entre todas) para pantallas con densidad de hasta 2. */
describe('SplashIntro: ilustraciones a la medida de la pantalla', () => {
  it('cada muñeco y cada cara ofrece su variante a la mitad con el ancho de cada una', () => {
    const { container } = render(<SplashIntro />);
    const images = [...container.querySelectorAll('.splash-muneco, .splash-head')];

    expect(images).toHaveLength(16);
    for (const image of images) {
      const width = Number(image.getAttribute('width'));
      const [half, full] = image.getAttribute('srcset').split(', ');
      expect(half).toMatch(new RegExp(`-mitad[^ ]*\\.webp ${Math.round(width / 2)}w$`));
      expect(full).toBe(`${image.getAttribute('src')} ${width}w`);
      expect(image.getAttribute('sizes')).toMatch(/^\(max-width: \d+px\) [\d.]+px, [\d.]+px$/);
    }
  });

  it('en un móvil el muñeco se pinta al 45 % y en escritorio a su tamaño', () => {
    const { container } = render(<SplashIntro />);
    // skater-ollie: 316 × 380 para 190 px de alto → 158 px de ancho, 71,1 en móvil
    expect(container.querySelector('.splash-muneco').getAttribute('sizes')).toBe(
      '(max-width: 486px) 71.1px, 158px'
    );
    expect(container.querySelector('.splash-head').getAttribute('sizes')).toBe(
      '(max-width: 554px) 72px, 150px'
    );
  });
});
