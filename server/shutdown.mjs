import { describeError } from './http/errors.mjs';

/* Apagado ordenado: primero se deja de aceptar peticiones y, ya sin nadie
   escribiendo, se vuelca lo que la pared y el almacén tengan pendiente en
   memoria. Devuelve el código de salida: 0 si todo ha quedado en disco. */
export function closeGracefully({ server, pared, store, logger }) {
  return new Promise((resolve) => {
    server.close(async (closeError) => {
      let exitCode = closeError ? 1 : 0;
      try {
        await pared?.volcar();
      } catch (error) {
        exitCode = 1;
        logger.error('Wall flush failed', describeError(error));
      }
      try {
        await store?.flush?.();
      } catch (error) {
        exitCode = 1;
        logger.error('State store flush failed', describeError(error));
      }
      resolve(exitCode);
    });
  });
}
