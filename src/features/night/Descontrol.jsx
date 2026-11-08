import { useEffect, useMemo, useRef, useState } from 'react';
import { useNightMode } from './useNightMode.js';
import { graffitiFor } from './graffiti.js';
import { subscribeTorch } from './torch.js';
import Spray from './spray/Spray.jsx';
import { prefersReducedMotion } from '../../utils/media.js';
import '../../styles/components/descontrol.css';

const FLASH_MS = 1400;
// La altura se redondea: las imágenes que cargan tarde no deben repintar la
// pared a cada píxel.
const HEIGHT_STEP = 200;
// A partir de aquí (fracción de scroll) se está «abajo del todo».
const BOTTOM = 0.9;
export const AWAY_TITLE = 'Te estamos viendo…';

const nextFrame = (callback) =>
  typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame(callback)
    : window.setTimeout(callback, 16);

const cancelFrame = (id) =>
  typeof window.cancelAnimationFrame === 'function'
    ? window.cancelAnimationFrame(id)
    : window.clearTimeout(id);

function pageSize() {
  return {
    height: Math.ceil(document.documentElement.scrollHeight / HEIGHT_STEP) * HEIGHT_STEP,
    width: window.innerWidth,
  };
}

/* La pared de noche: detrás de todo el contenido, la linterna ultravioleta
   enseña la tinta invisible que la crew ha dejado en esa página; fuera del
   haz apenas se intuye. Delante del contenido, una oscuridad que aprieta
   cuanto más se baja: la linterna se estrecha y, abajo del todo, Los del
   Banco se encienden porque te estaban esperando. */
function UvWall({ pathname }) {
  const wallRef = useRef(null);
  const inkRef = useRef(null);
  const darkRef = useRef(null);
  const [size, setSize] = useState(pageSize);
  const tags = useMemo(
    () => graffitiFor(pathname, size.height, size.width),
    [pathname, size.height, size.width]
  );

  useEffect(() => {
    const measure = () =>
      setSize((current) => {
        const next = pageSize();
        return next.height === current.height && next.width === current.width ? current : next;
      });
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(document.body);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [pathname]);

  // La linterna: la misma posición para la pared y para la oscuridad.
  useEffect(
    () =>
      subscribeTorch(({ x, y }) => {
        [wallRef.current, darkRef.current].forEach((element) => {
          element?.style.setProperty('--tx', `${Math.round(x)}px`);
          element?.style.setProperty('--ty', `${Math.round(y)}px`);
        });
      }),
    []
  );

  // El scroll: las pintadas suben con la página y la noche se hace más honda.
  useEffect(() => {
    let frame = 0;
    let atBottom = false;
    const paint = () => {
      frame = 0;
      const scrolled = window.scrollY;
      const room = document.documentElement.scrollHeight - window.innerHeight;
      const depth = room > 0 ? Math.min(1, Math.max(0, scrolled / room)) : 0;
      if (inkRef.current) inkRef.current.style.transform = `translate3d(0, ${-scrolled}px, 0)`;
      [wallRef.current, darkRef.current].forEach((element) =>
        element?.style.setProperty('--depth', depth.toFixed(3))
      );
      const bottom = room > 0 && depth >= BOTTOM;
      if (bottom !== atBottom) {
        atBottom = bottom;
        document.body.classList.toggle('uv-fondo', bottom);
      }
    };
    const schedule = () => {
      if (!frame) frame = nextFrame(paint);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    paint();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelFrame(frame);
      document.body.classList.remove('uv-fondo');
    };
  }, [pathname]);

  return (
    <>
      <div className="uv-wall" ref={wallRef} aria-hidden="true" data-testid="uv-wall">
        <div className="uv-torch" />
        <div className="uv-ink-window">
          <div className="uv-ink" ref={inkRef}>
            {tags.map((tag) => (
              <span
                key={tag.id}
                className={`uv-tag uv-tag--${tag.kind} uv-tag--${tag.side}${tag.vertical ? ' uv-tag--vertical' : ''}`}
                style={{
                  top: `${tag.y}px`,
                  [tag.side]: `${tag.x}px`,
                  '--giro': `${tag.rot}deg`,
                  '--tam': tag.size,
                }}
              >
                {tag.text}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="uv-oscuridad" ref={darkRef} aria-hidden="true" data-testid="uv-oscuridad" />
    </>
  );
}

/* Si se cambia de pestaña con el descontrol puesto, la pestaña avisa de que
   la crew sigue mirando; al volver, recupera su título. */
function useAwayTitle() {
  useEffect(() => {
    let saved = null;
    const restore = () => {
      if (saved !== null && document.title === AWAY_TITLE) document.title = saved;
      saved = null;
    };
    const onVisibility = () => {
      if (document.hidden) {
        if (document.title !== AWAY_TITLE) saved = document.title;
        document.title = AWAY_TITLE;
      } else {
        restore();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      restore();
    };
  }, []);
}

function NightScene({ pathname }) {
  useAwayTitle();
  // Rocky IA es una pantalla de chat a viewport completo: ahí no hay pared.
  const chat = pathname.startsWith('/rockyIA');
  return (
    <>
      <UvWall pathname={pathname} />
      {!chat && <Spray pathname={pathname} />}
    </>
  );
}

/* El modo descontrol: la escena de luz negra mientras dure la noche y, al
   encenderlo con la bombilla (no al llegar ya de noche), un apagón en el
   que se enciende el rótulo. Cuando el rótulo termina (o al momento, con
   movimiento reducido) avisa con `onActivated`: App lleva a la portada. */
export default function Descontrol({ pathname, disabled = false, onActivated }) {
  const night = useNightMode();
  const wasNight = useRef(night);
  const [flash, setFlash] = useState(false);
  // La última versión del aviso, sin reiniciar el temporizador en cada render.
  const onActivatedRef = useRef(onActivated);
  useEffect(() => {
    onActivatedRef.current = onActivated;
  }, [onActivated]);

  useEffect(() => {
    const turnedOn = night && !wasNight.current;
    wasNight.current = night;
    if (!night) setFlash(false);
    if (!turnedOn) return;
    if (prefersReducedMotion()) onActivatedRef.current?.();
    else setFlash(true);
  }, [night]);

  // El apagón se retira solo al acabar y entonces avisa; si se apaga el
  // descontrol a mitad, se va con él (el efecto de arriba lo quita) sin avisar.
  useEffect(() => {
    if (!flash) return undefined;
    const timer = window.setTimeout(() => {
      setFlash(false);
      onActivatedRef.current?.();
    }, FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);

  if (disabled) return null;

  return (
    <>
      {night && <NightScene pathname={pathname} />}
      {flash && (
        <div className="descontrol-flash" aria-hidden="true" data-testid="descontrol-flash">
          <span>Descontrol activado</span>
        </div>
      )}
    </>
  );
}
