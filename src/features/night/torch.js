/* La linterna del descontrol: una sola escucha de puntero, dedo y foco para
   todo lo que se ilumina de noche (la pared, la oscuridad que crece con el
   scroll, el 404 a oscuras). Cada quien se suscribe y pinta su propia
   variable CSS: poner --tx/--ty en <html> obligaría a recalcular los estilos
   de toda la página a cada movimiento del ratón. */

const listeners = new Set();
let position = null;
let frame = 0;
let detach = null;

const nextFrame = (callback) =>
  typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame(callback)
    : window.setTimeout(callback, 16);

const cancelFrame = (id) =>
  typeof window.cancelAnimationFrame === 'function'
    ? window.cancelAnimationFrame(id)
    : window.clearTimeout(id);

function emit() {
  frame = 0;
  listeners.forEach((listener) => listener(position));
}

function moveTo(x, y) {
  position = { x, y };
  if (!frame) frame = nextFrame(emit);
}

function attach() {
  const onPointer = (event) => moveTo(event.clientX, event.clientY);
  // Quien navega con el teclado también lleva linterna: apunta al foco.
  const onFocus = (event) => {
    const rect = event.target?.getBoundingClientRect?.();
    if (rect) moveTo(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
  document.addEventListener('focusin', onFocus);
  return () => {
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('pointerdown', onPointer);
    document.removeEventListener('focusin', onFocus);
    if (frame) cancelFrame(frame);
    frame = 0;
  };
}

export function torchPosition() {
  if (!position) position = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.4 };
  return position;
}

/* Se engancha a la linterna. Recibe la posición actual al momento y luego
   una vez por fotograma mientras se mueva. Devuelve la función para soltarla. */
export function subscribeTorch(listener) {
  torchPosition();
  listeners.add(listener);
  if (listeners.size === 1) detach = attach();
  listener(position);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && detach) {
      detach();
      detach = null;
    }
  };
}
