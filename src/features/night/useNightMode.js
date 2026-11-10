import { useSyncExternalStore } from 'react';
import { temaActual } from '../../utils/theme.js';

/* ¿Es de noche? El tema vive en <html data-theme> (ver utils/theme.js), así
   que se observa ese atributo: cualquier componente se entera del cambio de
   la bombilla sin que nadie le pase props. */
// Un único observador para todos: catorce componentes preguntan si es de
// noche y no hace falta que cada uno vigile el documento por su cuenta. Se
// crea con el primer suscriptor y se desconecta con el último.
const listeners = new Set();
let observer = null;

function subscribe(onChange) {
  if (typeof MutationObserver !== 'function') return () => {};
  listeners.add(onChange);
  if (!observer) {
    observer = new MutationObserver(() => listeners.forEach((listener) => listener()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && observer) {
      observer.disconnect();
      observer = null;
    }
  };
}

const isNight = () => temaActual() === 'neon';

export function useNightMode() {
  return useSyncExternalStore(subscribe, isNight, () => false);
}
