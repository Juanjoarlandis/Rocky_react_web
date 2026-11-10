import { Component, Suspense, lazy, useEffect, useState } from 'react';
import { asOptionalLoad } from '../preloadRecovery.js';

/* Piezas opcionales de la página (el descontrol, el curioso, el repartidor, la
   estampida…): no hacen falta para la primera pintura, así que su código y su
   CSS viajan en un chunk aparte que se pide cuando la página está en reposo o
   al primer gesto. */

// Si el chunk de una pieza no llega, la pieza se descarta y la página sigue.
class PieceBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Las piezas que `preloadPieces()` pide cuando la página queda en reposo.
const idlePieces = new Set();

/* Envuelve un `import()` en un componente que no pinta nada mientras carga.
   `Piece.preload()` pide el chunk sin montarla, y `preloadPieces()` lo hace
   con todas en reposo, para que su primer uso no espere a la red. Con
   `idle: false` la pieza se queda fuera de esa tanda: su código no se
   descarga ni se ejecuta hasta que se monta (el spray, que solo sale de
   noche). */
export function lazyPiece(load, { idle = true } = {}) {
  const optionalLoad = asOptionalLoad(load);
  const Lazy = lazy(optionalLoad);
  function Piece(props) {
    return (
      <PieceBoundary>
        <Suspense fallback={null}>
          <Lazy {...props} />
        </Suspense>
      </PieceBoundary>
    );
  }
  Piece.preload = () =>
    optionalLoad().then(
      () => undefined,
      () => undefined
    );
  if (idle) idlePieces.add(Piece);
  return Piece;
}

// Pide los chunks de todas las piezas; una que no llegue no estorba al resto.
export function preloadPieces() {
  return Promise.all([...idlePieces].map((Piece) => Piece.preload())).then(() => undefined);
}

// Un gesto cualquiera adelanta la carga: quien toca la página puede necesitarlas ya.
const WAKE_EVENTS = ['pointerdown', 'keydown', 'focusin', 'touchstart', 'click'];
const IDLE_FALLBACK_MS = 2500;

/* `true` cuando ya se pueden montar las piezas opcionales: con la página en
   reposo (o a los 2,5 s donde no hay requestIdleCallback) o al primer gesto.
   Con `hold` el reposo no cuenta todavía: mientras la página espera sus datos
   el hilo está libre pero la red no, y pedir entonces las piezas le quita
   ancho de banda a lo que sí se va a ver. Un gesto las trae igualmente. */
export function usePiecesReady({ hold = false } = {}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return undefined;
    const wake = () => setReady(true);
    WAKE_EVENTS.forEach((type) =>
      window.addEventListener(type, wake, { capture: true, passive: true })
    );
    return () =>
      WAKE_EVENTS.forEach((type) => window.removeEventListener(type, wake, { capture: true }));
  }, [ready]);

  useEffect(() => {
    if (ready || hold) return undefined;
    const wake = () => setReady(true);
    const hasIdle = typeof window.requestIdleCallback === 'function';
    const id = hasIdle
      ? window.requestIdleCallback(wake, { timeout: 4000 })
      : window.setTimeout(wake, IDLE_FALLBACK_MS);
    return () => {
      if (hasIdle) window.cancelIdleCallback?.(id);
      else window.clearTimeout(id);
    };
  }, [ready, hold]);

  return ready;
}
