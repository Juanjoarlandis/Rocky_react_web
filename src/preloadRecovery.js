const PRELOAD_RELOAD_KEY = 'rocky-preload-reload';
const BOOT_STABILITY_MS = 10_000;

export function recoverFromPreloadError(event, {
  storage = window.sessionStorage,
  reload = () => window.location.reload(),
} = {}) {
  event.preventDefault();
  if (storage.getItem(PRELOAD_RELOAD_KEY)) return false;

  storage.setItem(PRELOAD_RELOAD_KEY, '1');
  reload();
  return true;
}

export function installPreloadRecovery(browserWindow = window) {
  const handlePreloadError = (event) => recoverFromPreloadError(event, {
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
