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
