import { artSources } from '../../data/art.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CREW } from '../../data/crew.js';
import { useNightArtResolver } from '../night/nightArt.js';
import { prefersReducedMotion } from '../../utils/media.js';
import { SECRET, listenForSecret } from './secret.js';
import '../../styles/components/estampida.css';

export { SECRET };
// Quién corre: toda la crew menos el banco de los fundadores, que no se
// levanta ni para esto.
const RUNNERS = CREW.filter((member) => member.id !== 'fundadores');

/* Cada corredor con su carril, su tamaño, su ritmo y su salida. Sale al
   azar en cada estampida: nunca pasa igual dos veces. */
function lineUp() {
  return RUNNERS.map((member, index) => ({
    id: member.id,
    img: member.img,
    lane: Math.round(8 + Math.random() * 76),
    height: Math.round(70 + Math.random() * 70),
    duration: +(2.3 + Math.random() * 1.5).toFixed(2),
    delay: +((index / RUNNERS.length) * 1.1 + Math.random() * 0.4).toFixed(2),
    jumps: Math.random() < 0.3,
  }));
}

/* La primera vez las imágenes no están en caché: sin esperar, los primeros
   cruzarían invisibles. Se espera a tenerlas listas, con un tope para que el
   huevo de pascua no se quede colgado en una conexión lenta. */
// Alto máximo de un corredor (70 + 70 px): decide la variante de su dibujo.
const RUNNER_MAX_HEIGHT = 140;
const PRELOAD_MAX_MS = 1500;

function preload(sources) {
  const loads = sources.map((src) => {
    const image = new Image();
    image.src = src;
    return typeof image.decode === 'function' ? image.decode().catch(() => {}) : Promise.resolve();
  });
  return Promise.race([
    Promise.all(loads),
    new Promise((resolve) => window.setTimeout(resolve, PRELOAD_MAX_MS)),
  ]);
}

function lifetimeOf(runners) {
  return Math.ceil(Math.max(...runners.map((r) => r.delay + r.duration)) * 1000) + 300;
}

/* El huevo de pascua: se teclea 035 en cualquier página (fuera de un campo
   de texto) y la crew entera cruza la pantalla corriendo. De noche corren sus
   versiones malvadas. Con movimiento reducido no corren: aparecen en fila y
   se desvanecen. */
export default function Estampida({ disabled = false, listen = true, launchSignal = 0 }) {
  const [runners, setRunners] = useState(null);
  const [still, setStill] = useState(false);
  const launching = useRef(false);
  const mounted = useRef(true);
  const artFor = useNightArtResolver();

  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  const launch = useCallback(() => {
    if (launching.current) return;
    launching.current = true;
    const lineup = lineUp();
    preload(lineup.map((runner) => artSources(artFor(runner.img), RUNNER_MAX_HEIGHT).src)).then(
      () => {
        if (!mounted.current) return;
        setStill(prefersReducedMotion());
        setRunners(lineup);
      }
    );
  }, [artFor]);

  // Con `listen`, la propia pieza escucha la secuencia. En la aplicación la
  // escucha App (la pieza se carga aparte) y avisa subiendo `launchSignal`.
  useEffect(() => {
    if (disabled || !listen) return undefined;
    return listenForSecret(launch);
  }, [disabled, listen, launch]);

  // Cada señal se atiende una vez: `launch` cambia de identidad con el tema
  // (el arte de noche) y eso no es teclear «035» otra vez.
  const servedSignal = useRef(0);
  useEffect(() => {
    if (disabled || launchSignal <= servedSignal.current) return;
    servedSignal.current = launchSignal;
    launch();
  }, [disabled, launchSignal, launch]);

  useEffect(() => {
    if (!runners) return undefined;
    const timer = window.setTimeout(
      () => {
        launching.current = false;
        setRunners(null);
      },
      still ? 2600 : lifetimeOf(runners)
    );
    return () => window.clearTimeout(timer);
  }, [runners, still]);

  if (!runners) return null;

  return (
    <div
      className={`estampida${still ? ' is-quieta' : ''}`}
      aria-hidden="true"
      data-testid="estampida"
    >
      <p className="estampida-grito">¡Estampida!</p>
      {runners.map((runner, index) => (
        <span
          key={runner.id}
          className={`estampida-corredor${runner.jumps ? ' salta' : ''}`}
          style={{
            '--carril': `${runner.lane}vh`,
            '--alto': `${runner.height}px`,
            '--dura': `${runner.duration}s`,
            '--sale': `${runner.delay}s`,
            '--fila': index,
            '--total': runners.length,
          }}
        >
          <img
            {...artSources(artFor(runner.img), RUNNER_MAX_HEIGHT)}
            alt=""
            className="estampida-art neon-art"
            draggable="false"
          />
        </span>
      ))}
    </div>
  );
}
