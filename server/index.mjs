import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { createApp } from './app.mjs';
import { describeError } from './http/errors.mjs';

dotenv.config({ quiet: true });

// Arranque del proceso: escucha, señales de apagado y promesas sueltas.
// La composición de la aplicación vive en app.mjs.
export function startServer() {
  const app = createApp();
  const { config, logger } = app.locals;
  const server = app.listen(config.port, () => {
    logger.info('ROCKY 035 server listening', { port: config.port });
  });

  // Una promesa suelta sin catch no debe morir en silencio: se registra con
  // su stack y el proceso sigue sirviendo.
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', describeError(reason));
  });

  const shutdown = (signal) => {
    logger.info('Closing HTTP server', { signal });
    server.close((error) => {
      process.exitCode = error ? 1 : 0;
    });
    setTimeout(() => {
      process.exitCode = 1;
      server.closeAllConnections?.();
    }, 10_000).unref();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
