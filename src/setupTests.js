import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: () => {},
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (media) => ({
    matches: false,
    media,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: () => Promise.resolve(),
});

Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: () => {},
});

// jsdom no pinta: sin el paquete canvas, getContext() avisa por consola y
// devuelve null. El spray del descontrol ya sabe vivir sin contexto; aquí
// sólo se calla el aviso.
Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => null,
});
