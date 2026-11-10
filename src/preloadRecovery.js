import { STORAGE_KEYS } from './config/storageKeys.js';

const PRELOAD_RELOAD_KEY = STORAGE_KEYS.preloadReload;
const BOOT_STABILITY_MS = 10_000;

/* Cargas opcionales en vuelo: las piezas que la página pide por su cuenta en
   reposo (el descontrol, el curioso, el lightbox…). Si su chunk no llega, la
   página sigue sin la pieza; recargarla no arregla nada y, sin red, la tumba. */
let optionalLoads = 0;

/* Envuelve un `import()` opcional para que, mientras esté en vuelo, un fallo
   de precarga de Vite no dispare la recarga de la página. */
export function asOptionalLoad(load) {
  return () => {
    optionalLoads += 1;
    const settle = () => {
      optionalLoads -= 1;
    };
    let loading;
    try {
      loading = Promise.resolve(load());
    } catch (error) {
      loading = Promise.reject(error);
    }
    loading.then(settle, settle);
    return loading;
  };
}

export function recoverFromPreloadError(
  event,
  { storage = window.sessionStorage, reload = () => window.location.reload() } = {}
) {
  // Sin cancelar el evento, Vite rechaza el import y la pieza se descarta sola.
  if (optionalLoads > 0) return false;
  event.preventDefault();
  if (storage.getItem(PRELOAD_RELOAD_KEY)) return false;

  storage.setItem(PRELOAD_RELOAD_KEY, '1');
  reload();
  return true;
}

export function installPreloadRecovery(browserWindow = window) {
  const handlePreloadError = (event) =>
    recoverFromPreloadError(event, {
      storage: browserWindow.sessionStorage,
      reload: () => browserWindow.location.reload(),
    });
  browserWindow.addEventListener('vite:preloadError', handlePreloadError);
  return () => browserWindow.removeEventListener('vite:preloadError', handlePreloadError);
}

export function clearPreloadRecoveryGuardAfterBoot({
  storage = window.sessionStorage,
  schedule = window.setTimeout.bind(window),
} = {}) {
  return schedule(() => storage.removeItem(PRELOAD_RELOAD_KEY), BOOT_STABILITY_MS);
}
