import path from 'node:path';

// Configuración del almacén de estado. Es de toda la aplicación (sesiones,
// avisos, perfiles Crew, idempotencia), no sólo de Shopify: por eso no vive
// en config/shopify.mjs.
export function createStorageConfig(env = process.env) {
  const encryptionKey = env.APP_ENCRYPTION_KEY || '';
  return Object.freeze({
    encryptionKey,
    stateStorePath: path.resolve(env.STATE_STORE_PATH || '.data/rocky-state.enc'),
    // Sin clave no hay fichero cifrado: el estado vive en memoria y se pierde
    // al reiniciar, así que las funciones que lo necesitan quedan apagadas.
    hasStateStore: Boolean(encryptionKey),
  });
}
