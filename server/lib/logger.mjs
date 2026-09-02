// Logger único del servidor: una línea JSON por evento con time, level,
// message y los campos que acompañen. Tres niveles (info, warn, error) y un
// solo contrato; nunca se registran cuerpos, cabeceras, cookies ni tokens.

const LEVELS = Object.freeze({ error: 0, warn: 1, info: 2 });

export function createLogger({
  stream = process.stdout,
  level = 'info',
  clock = () => new Date(),
  base = {},
} = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  function write(levelName, message, fields) {
    if (LEVELS[levelName] > threshold) return;
    const entry = {
      time: clock().toISOString(),
      level: levelName,
      message: String(message),
      ...base,
      ...(fields && typeof fields === 'object' ? fields : {}),
    };
    stream.write(`${JSON.stringify(entry)}\n`);
  }

  return {
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
  };
}

const noop = () => {};

// Logger mudo: el que reciben los módulos cuando nadie les inyecta uno. Sólo
// la aplicación decide escribir en stdout.
export const silentLogger = Object.freeze({ info: noop, warn: noop, error: noop });

// Garantiza el contrato {info, warn, error} sobre cualquier logger que llegue
// por inyección (p. ej. un doble de test con sólo error e info): lo que falte
// cae al nivel inferior más cercano y, si no hay ninguno, no hace nada.
export function ensureLogger(logger) {
  if (!logger) return silentLogger;
  if (
    typeof logger.info === 'function' &&
    typeof logger.warn === 'function' &&
    typeof logger.error === 'function'
  ) {
    return logger;
  }
  const info = typeof logger.info === 'function' ? logger.info.bind(logger) : noop;
  const warn = typeof logger.warn === 'function' ? logger.warn.bind(logger) : info;
  const error = typeof logger.error === 'function' ? logger.error.bind(logger) : warn;
  return { info, warn, error };
}
