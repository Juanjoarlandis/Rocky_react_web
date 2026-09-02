import React, { useEffect, useRef, useState } from 'react';
import asomadoBorde from '../../images/optimized/characters/asomado-borde-600.webp';
// Derivado de `characters/cotilla-esquina.png` (620x820, el original de
// ImageGen): mismo encuadre a 348x460, que sobra para los 115 px que se ve como
// mucho, y pesa 47 kB en vez de 585 kB.
import cotillaEsquina from '../../images/optimized/characters/cotilla-esquina-460.webp';
import { POSES, biteEdge, choosePlacement, clamp } from './geometry.js';
import {
  collectSpots,
  measureBite,
  readBlockedZones,
  readViewport,
  refreshPlacement,
} from './domProbe.js';
import '../../styles/CuriousPeeker.css';

// EL MUÑECO CURIOSO — aquí sólo viven el estado, los temporizadores y el
// render. Las medidas de cada pose están en `geometry.js`; esto es la imagen
// que se pinta con ellas.
const POSE_ART = Object.freeze({
  arriba: asomadoBorde,
  esquina: cotillaEsquina,
});

/* No siempre se asoma igual: unas veces saca el gorro y los ojos, otras sólo
   el gorro, y a ratos se estira entero antes de volver a meterse. Es la
   fracción del dibujo que se queda escondida por detrás del canto. */
const PEEK_HIDDEN = Object.freeze({
  arriba: { peek: [0.3, 0.46], full: 0.08 },
  esquina: { peek: [0.34, 0.5], full: 0.05 },
});
const TUCKED = 1;
const RESTING = Object.freeze({ hidden: TUCKED, beat: 'espera' });

// Duración del vaivén: sirve para repartir la fase y que no salga siempre igual.
const IDLE_CYCLE = 4.3;

const DESKTOP_TIMING = Object.freeze({
  firstWait: [4_500, 7_500],
  visibleFor: [2_600, 3_600],
  gap: [9_000, 17_000],
});

const MOBILE_TIMING = Object.freeze({
  firstWait: [7_000, 10_000],
  visibleFor: [2_400, 3_200],
  gap: [15_000, 26_000],
});

function matches(query) {
  return globalThis.matchMedia?.(query).matches ?? false;
}

function between([min, max]) {
  return min + Math.random() * (max - min);
}

export default function CuriousPeeker({ pathname, disabled = false }) {
  const [placement, setPlacement] = useState(null);
  const [peek, setPeek] = useState(RESTING);
  const boxRef = useRef(null);
  const activeRef = useRef(null);
  const lastKeyRef = useRef(null);

  useEffect(() => {
    setPlacement(null);
    setPeek(RESTING);
    activeRef.current = null;
    lastKeyRef.current = null;
    if (disabled || matches('(prefers-reduced-motion: reduce)')) return undefined;

    const timing = matches('(max-width: 640px)') ? MOBILE_TIMING : DESKTOP_TIMING;
    let showTimer;
    let leanTimer;
    let hideTimer;
    let clearTimer;
    let revealFrame;

    function appear() {
      if (document.hidden) {
        showTimer = window.setTimeout(appear, 4_000);
        return;
      }

      const view = readViewport();
      const scale = clamp(view.width / 1180, 0.72, 1.06);
      const next = choosePlacement({
        view,
        scale,
        spots: collectSpots(view, scale),
        zones: readBlockedZones(),
        avoidKey: lastKeyRef.current,
      });

      // Nada donde esconderse ahora mismo: lo vuelve a intentar más tarde.
      if (!next) {
        showTimer = window.setTimeout(appear, between(timing.gap));
        return;
      }

      const bite = next.element ? measureBite(next.element, next) : null;
      const placed = biteEdge(next, bite);
      lastKeyRef.current = placed.key;
      activeRef.current = { ...placed, scale, bite };
      // Cada salida arranca el vaivén en otro punto y mirando al otro lado,
      // así que ninguna aparición se ve calcada de la anterior.
      setPlacement({
        ...placed,
        phase: -(Math.random() * IDLE_CYCLE).toFixed(2),
        gaze: Math.random() < 0.5 ? 'normal' : 'reverse',
      });

      const levels = PEEK_HIDDEN[placed.pose];
      const peekLevel = levels.peek[Math.random() < 0.6 ? 0 : 1];
      const stretches = Math.random() < 0.65;
      const visibleFor = between(timing.visibleFor);
      revealFrame = window.requestAnimationFrame(() =>
        setPeek({ hidden: peekLevel, beat: 'sale' })
      );

      // Asoma lo justo y, si se confía, se estira entero antes de esconderse.
      if (stretches) {
        leanTimer = window.setTimeout(
          () => setPeek({ hidden: levels.full, beat: 'estira' }),
          visibleFor * 0.5
        );
      }

      hideTimer = window.setTimeout(() => {
        setPeek({ hidden: TUCKED, beat: 'escapa' });
        clearTimer = window.setTimeout(() => {
          setPlacement(null);
          activeRef.current = null;
        }, 400);
        showTimer = window.setTimeout(appear, between(timing.gap));
      }, visibleFor);
    }

    showTimer = window.setTimeout(appear, between(timing.firstWait));

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(leanTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
      window.cancelAnimationFrame?.(revealFrame);
    };
  }, [disabled, pathname]);

  // Mientras está fuera sigue a su escondite: si el usuario baja, baja con él.
  // Sólo se recoloca cuando la página se mueve —scroll o cambio de tamaño— y
  // como mucho una vez por frame, en vez de recalcular a 60 fps sin parar.
  useEffect(() => {
    if (!placement?.element) return undefined;

    let frame = null;

    function follow() {
      frame = null;
      const active = activeRef.current;
      const node = boxRef.current;
      if (!active || !node) return;

      const next = refreshPlacement(active, readViewport());

      // Su escondite se ha ido de pantalla: se mete dentro y no vuelve a salir.
      if (!next) {
        setPeek({ hidden: TUCKED, beat: 'escapa' });
        return;
      }

      node.style.transform = `translate3d(${next.left}px, ${next.top}px, 0)`;
    }

    function schedule() {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(follow);
    }

    // En captura, para enterarse también de los contenedores con scroll propio.
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [placement]);

  if (!placement) return null;

  const art = POSES[placement.pose];
  const isCorner = placement.pose === 'esquina';
  // Al esconderse se mete justo lo que asoma: el alto por arriba, el ancho de
  // la franja visible por el lateral. Hacia el bloque, que es donde se tapa.
  const travel = isCorner ? placement.art.cut : placement.art.height;
  const direction = placement.side === 'der' ? -1 : 1;
  const offset = Math.round(peek.hidden * travel) * direction;

  return (
    <div
      ref={boxRef}
      className={[
        'curious-peeker',
        `curious-peeker--${placement.pose}`,
        placement.side ? `curious-peeker--${placement.side}` : '',
        `curious-peeker--${peek.beat}`,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: `${placement.width}px`,
        height: `${placement.height}px`,
        transform: `translate3d(${placement.left}px, ${placement.top}px, 0)`,
      }}
      data-testid="curious-peeker"
      data-spot={placement.key}
      data-pose={placement.pose}
      data-side={placement.side || ''}
      data-beat={peek.beat}
      aria-hidden="true"
    >
      <span
        className="curious-peeker-slide"
        style={{
          transform: isCorner ? `translateX(${offset}px)` : `translateY(${offset}px)`,
        }}
      >
        <span className="curious-peeker-mirror">
          <img
            className="curious-peeker-art neon-art"
            src={POSE_ART[placement.pose]}
            width={art.width}
            height={art.height}
            style={{
              '--fase': `${placement.phase}s`,
              '--mira': placement.gaze,
              width: `${placement.art.width}px`,
              ...(isCorner ? { right: `${placement.art.cut - placement.art.width}px` } : null),
            }}
            decoding="async"
            draggable="false"
            alt=""
          />
        </span>
      </span>
    </div>
  );
}
