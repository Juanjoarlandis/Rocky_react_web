// Claves de localStorage/sessionStorage. Todas con prefijo rocky- para no
// pisar a nadie y para poder limpiarlas de un vistazo.
export const STORAGE_KEYS = Object.freeze({
  splashSeen: 'rocky-splash-seen',
  albumOpened: 'rocky-album-abiertos',
  beatTable: 'rocky-mesa-beats',
  preloadReload: 'rocky-preload-reload',
  spray: 'rocky-spray',
  // Ya se avisó de que la pared compartida la ve todo el mundo.
  paredAviso: 'rocky-pared-aviso',
  // El apodo con el que publicas en el ranking de beats, para no reescribirlo.
  beatsAlias: 'rocky-beats-apodo',
  // Sólo en el navegador de quien administra: la llave para quitar beats.
  beatsAdmin: 'rocky-beats-admin',
});

// Un recibo por producto: «ya te apuntamos al aviso de este drop».
export function dropNoticeKey(productHandle) {
  return `rocky-aviso-${productHandle}`;
}
