// Fila india: cada acción espera a que termine la anterior, falle o no. Sirve
// para que un get y un set sobre el mismo estado no se pisen entre medias.
export function createSerialQueue() {
  let tail = Promise.resolve();

  return function enqueue(action) {
    const result = tail.then(action, action);
    tail = result.catch(() => {});
    return result;
  };
}
