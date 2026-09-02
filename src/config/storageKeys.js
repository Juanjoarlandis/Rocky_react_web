// Claves de localStorage/sessionStorage. Todas con prefijo rocky- para no
// pisar a nadie y para poder limpiarlas de un vistazo.
export const STORAGE_KEYS = Object.freeze({
  splashSeen: 'rocky-splash-seen',
  albumOpened: 'rocky-album-abiertos',
  beatTable: 'rocky-mesa-beats',
  preloadReload: 'rocky-preload-reload',
  theme: 'rocky-theme',
});

// Un recibo por producto: «ya te apuntamos al aviso de este drop».
export function dropNoticeKey(productHandle) {
  return `rocky-aviso-${productHandle}`;
}
