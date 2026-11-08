import { useSyncExternalStore } from 'react';
import { temaActual } from '../../utils/theme.js';

/* ¿Es de noche? El tema vive en <html data-theme> (ver utils/theme.js), así
   que se observa ese atributo: cualquier componente se entera del cambio de
   la bombilla sin que nadie le pase props. */
function subscribe(onChange) {
  if (typeof MutationObserver !== 'function') return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

const isNight = () => temaActual() === 'neon';

export function useNightMode() {
  return useSyncExternalStore(subscribe, isNight, () => false);
}
