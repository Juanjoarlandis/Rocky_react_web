// Candado por clave: dos acciones con la misma clave se ejecutan una detrás de
// otra; con claves distintas, en paralelo. La cola de cada clave se recoge
// sola cuando su última acción termina, así que no crece con el tráfico.
export function createKeyedLock() {
  const tails = new Map();

  return async function withLock(key, action) {
    const previous = tails.get(key) || Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    tails.set(key, tail);
    await previous;
    try {
      return await action();
    } finally {
      release();
      if (tails.get(key) === tail) tails.delete(key);
    }
  };
}
