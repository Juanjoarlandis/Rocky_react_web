import { useEffect, useState } from 'react';
// El repartidor de ROCKY, el que sale corriendo con la bolsa. El dibujo va
// mirando a la derecha, que es justo hacia donde está el carrito en la barra:
// no hay que voltearlo.
import corriendoBolsa from '../../images/optimized/characters/corriendo-bolsa-600.webp';
import '../../styles/components/cart-runner.css';
import { clamp } from '../../utils/math.js';
import { prefersReducedMotion } from '../../utils/media.js';

const ART = Object.freeze({ width: 589, height: 600 });

// Alto al que se ve. En móvil se queda pequeño para no taparle media barra.
const MIN_ALTO = 56;
const MAX_ALTO = 96;
const ALTO_POR_ANCHO = 13;

// Lo que tarda en cruzar. La zancada va aparte y en bucle.
export const CRUCE_MS = 1000;
// Aire de sobra por la izquierda: entra ya lanzado, no arranca desde parado.
const MARGEN_SALIDA = 24;
// Lo que deja por debajo de lo que tenga encima mientras corre.
const HUECO_BARRA = 10;
// Trastos fijos de la esquina de arriba por los que no debe pasar por encima.
const ESTORBOS = '.mini-player';

/* Cuánto mide a este ancho de ventana, respetando la proporción del dibujo. */
export function medidas(anchoVentana) {
  const alto = Math.round(clamp(anchoVentana / ALTO_POR_ANCHO, MIN_ALTO, MAX_ALTO));
  return { alto, ancho: Math.round((alto * ART.width) / ART.height) };
}

/* El recorrido tiene dos tramos. Corre por un carril justo por debajo de la
   barra —centrarlo en el icono le dejaría la cabeza fuera de la ventana, porque
   mide más que el alto de la barra— y al llegar debajo del carrito pega el salto
   y se mete dentro. Por eso hay dos alturas: la del carril y la del icono.

   Devuelve null si el icono no está en pantalla: en esa esquina siempre lo está,
   pero si algún día la barra se esconde al bajar, mejor no lanzar a nadie a
   ninguna parte. */
export function planRun(destino, size, view, estorbos = []) {
  if (!destino || destino.width <= 0 || destino.height <= 0) return null;
  if (destino.bottom < 0 || destino.top > view.height) return null;

  const hastaX = Math.round(destino.left + destino.width / 2 - size.ancho / 2);

  /* El carril baja hasta pasar por debajo de lo que esté aparcado en la
       columna donde frena: en esa esquina vive la píldora de la radio, y
       cruzarle por encima justo al final se lee como un choque, no como que
       pasa por delante. Sólo cuentan los trastos que pillan su columna; uno
       que esté al otro lado de la pantalla no tiene por qué agacharle. */
  const columna = { left: hastaX, right: hastaX + size.ancho };
  const suelo = estorbos.reduce((bajo, estorbo) => {
    if (!estorbo || estorbo.width <= 0 || estorbo.height <= 0) return bajo;
    const cruza = estorbo.left < columna.right && estorbo.right > columna.left;
    return cruza ? Math.max(bajo, estorbo.bottom) : bajo;
  }, destino.bottom);

  // Y nunca tan abajo que se salga por el canto de una ventana apaisada.
  const correY = Math.round(Math.min(suelo + HUECO_BARRA, view.height - size.alto - HUECO_BARRA));

  return {
    desdeX: -(size.ancho + MARGEN_SALIDA),
    hastaX,
    correY,
    saltoY: Math.round(destino.top + destino.height / 2 - size.alto / 2),
  };
}

/* Cada vez que `runId` sube es que algo ha entrado en el carrito de verdad: el
   contador de arriba cambia en ese mismo momento y él llega para explicarlo. No
   se dispara mirando el total, porque el total también sube al hidratar el
   carrito guardado y al tocar el `+` de la página del carrito. */
export default function CartRunner({ runId = 0, disabled = false }) {
  const [carrera, setCarrera] = useState(null);

  useEffect(() => {
    if (!runId || disabled) return undefined;
    // Con el movimiento reducido no hay carrera: el gesto ES el recorrido,
    // así que sin recorrido no queda nada que enseñar.
    if (prefersReducedMotion()) return undefined;
    // En una pestaña de fondo no se vería, y volvería a saltar al enfocarla.
    if (document.hidden) return undefined;

    const icono = document.querySelector('.navbar-cart');
    if (!icono) return undefined;

    const view = {
      width: window.innerWidth || document.documentElement.clientWidth,
      height: window.innerHeight || document.documentElement.clientHeight,
    };
    const size = medidas(view.width);
    const estorbos = [...document.querySelectorAll(ESTORBOS)].map((nodo) =>
      nodo.getBoundingClientRect()
    );
    const plan = planRun(icono.getBoundingClientRect(), size, view, estorbos);
    if (!plan) return undefined;

    setCarrera({ id: runId, ...plan, ...size });
    // Se desmonta al acabar: mientras no corre no deja nada en el árbol.
    const timer = window.setTimeout(() => setCarrera(null), CRUCE_MS + 120);
    return () => window.clearTimeout(timer);
  }, [runId, disabled]);

  if (!carrera) return null;

  return (
    // La `key` es lo que hace que dos añadidos seguidos reinicien la carrera
    // en vez de dejar la primera a medias: al cambiar, React lo monta de
    // nuevo y la animación arranca desde el principio.
    <div
      key={carrera.id}
      className="cart-runner"
      style={{
        '--desde-x': `${carrera.desdeX}px`,
        '--hasta-x': `${carrera.hastaX}px`,
        '--corre-y': `${carrera.correY}px`,
        '--salto-y': `${carrera.saltoY}px`,
        '--cruce': `${CRUCE_MS}ms`,
        width: `${carrera.ancho}px`,
        height: `${carrera.alto}px`,
      }}
      data-testid="cart-runner"
      aria-hidden="true"
    >
      <img
        src={corriendoBolsa}
        width={ART.width}
        height={ART.height}
        decoding="async"
        draggable="false"
        alt=""
        className="cart-runner-art neon-art"
      />
    </div>
  );
}
