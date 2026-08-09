import React, { useEffect, useRef, useState } from 'react';
import asomadoBorde from '../images/optimized/characters/asomado-borde-600.webp';
// Derivado de `characters/cotilla-esquina.png` (620x820, el original de
// ImageGen): mismo encuadre a 348x460, que sobra para los 115 px que se ve como
// mucho, y pesa 47 kB en vez de 585 kB.
import cotillaEsquina from '../images/optimized/characters/cotilla-esquina-460.webp';
import '../styles/CuriousPeeker.css';

/* Dos poses, cada una hecha para un canto distinto de un bloque de la página.

   - `arriba`: El Curioso se agarra al filo de arriba y saca la cabeza. El
     dibujo termina en su borde inferior, así que ese corte se apoya en el canto
     y no se ve. Nunca se gira: tumbado quedaría con la cara torcida.
   - `esquina`: El Cotilla se asoma por un lateral, apoyado en la base del
     bloque. La mano de dentro agarra el canto vertical justo en x = 360 del
     lienzo de 620x820, y las piernas y los pies se quedan detrás del bloque.
     Por eso sólo se enseña la franja 0..360 y el resto se recorta. */
const POSES = Object.freeze({
  arriba: { src: asomadoBorde, width: 767, height: 600, size: 104 },
  esquina: { src: cotillaEsquina, width: 620, height: 820, corte: 360, size: 106 },
});

/* No siempre se asoma igual: unas veces saca el gorro y los ojos, otras sólo
   el gorro, y a ratos se estira entero antes de volver a meterse. Es la
   fracción del dibujo que se queda escondida por detrás del canto. */
const PEEK_HIDDEN = Object.freeze({
  arriba: { asoma: [0.3, 0.46], entero: 0.08 },
  esquina: { asoma: [0.34, 0.5], entero: 0.05 },
});
const TUCKED = 1;
const RESTING = Object.freeze({ hidden: TUCKED, beat: 'espera' });

/* Hueco por los lados por los que no hay bloque, para que pueda estirarse al
   salir sin que la ventana le corte el gorro. */
const STRETCH_ROOM = 0.12;
// Duración del vaivén: sirve para repartir la fase y que no salga siempre igual.
const IDLE_CYCLE = 4.3;

// Bloques de la página con canto suficiente para agarrarse a él.
const SPOT_SELECTOR =
  'section, article, aside, figure, form, table, nav, header, footer, ' +
  'ul[class], ol[class], li[class], a[class], div[class]';

// Elementos flotantes que no debe tapar aunque queden por encima de él.
const BLOCKED_SELECTOR = '.navbar, .mini-player, .chat-composer';

const MAX_SPOT_NODES = 500;
const SAFE_GAP = 6;
// Las sombras de ROCKY son bloques de tinta de 2 a 9 px; se acota por si algún
// día aparece un desenfoque enorme que lo mandaría lejísimos del bloque.
const MAX_SHADOW = 24;
const NO_SHADOW = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
// Hasta dónde busca el trazo real del canto y cuánto lo muerde al agarrarse.
const MAX_PROBE = 34;
const EDGE_BITE = 2;
// Cuánto puede solaparse con otro bloque antes de dejar de parecer escondido.
const MAX_SPOT_OVERLAP = 0.3;
const MAX_BLOCKED_OVERLAP = 0.2;

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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/* Zona útil de la pantalla: por debajo de la barra y por encima del borde. */
export function readViewport() {
  const width = window.innerWidth || document.documentElement.clientWidth;
  const height = window.innerHeight || document.documentElement.clientHeight;
  const navbar = document.querySelector('.navbar');
  const navRect = navbar?.getBoundingClientRect();
  const top = navRect && navRect.top <= 2 ? navRect.bottom + SAFE_GAP : SAFE_GAP;
  return { width, height, top, bottom: height - SAFE_GAP };
}

/* Cuánto sobresale la sombra por cada lado. En ROCKY son bloques de tinta
   duros desplazados abajo y a la derecha, y forman parte del bloque: si se
   ignoran, el muñeco se dibuja por encima de la sombra en vez de salir de
   detrás de ella. `elementFromPoint` no las ve, así que hay que leerlas. */
export function shadowExtents(boxShadow) {
  const nada = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!boxShadow || boxShadow === 'none') return nada;

  // El color puede llevar comas: se aparta antes de separar las capas.
  const capas = boxShadow.replace(/\b\w+\([^)]*\)/g, '').split(',');
  return capas.reduce((acc, capa) => {
    if (capa.includes('inset')) return acc;
    const medidas = (capa.match(/-?[\d.]+px/g) || []).map(parseFloat);
    if (medidas.length < 2) return acc;
    const [dx, dy, blur = 0, spread = 0] = medidas;
    const halo = blur + spread;
    const tope = (valor) => clamp(Math.round(valor), 0, MAX_SHADOW);
    return {
      top: Math.max(acc.top, tope(halo - dy)),
      right: Math.max(acc.right, tope(halo + dx)),
      bottom: Math.max(acc.bottom, tope(halo + dy)),
      left: Math.max(acc.left, tope(halo - dx)),
    };
  }, nada);
}

/* El bloque más su sombra: es lo que hay que respetar para no pisarlo. */
function inflate(rect, shadow) {
  return {
    left: rect.left - shadow.left,
    right: rect.right + shadow.right,
    top: rect.top - shadow.top,
    bottom: rect.bottom + shadow.bottom,
  };
}

/* Devuelve la sombra del bloque si sirve de escondite, o null si no. */
function surfaceOf(element) {
  const style = window.getComputedStyle(element);
  if (style.visibility === 'hidden' || Number(style.opacity) < 0.9) return null;
  const channels = style.backgroundColor.match(/[\d.]+/g);
  const opaco =
    style.backgroundImage !== 'none' ||
    (channels && (channels.length < 4 || Number(channels[3]) >= 0.9));
  return opaco ? shadowExtents(style.boxShadow) : null;
}

/* Sólo sirven de escondite los bloques opacos: si se transparentan se le vería
   el recorte. El alto pedido es el de una franja con cuerpo, no el del dibujo;
   cada colocación ya comprueba después si le cabe. */
export function collectSpots(view) {
  const minWidth = view.width < 640 ? 140 : 170;
  const minHeight = view.width < 640 ? 38 : 44;
  const nodes = document.querySelectorAll(SPOT_SELECTOR);
  const spots = [];

  for (let index = 0; index < Math.min(nodes.length, MAX_SPOT_NODES); index += 1) {
    const element = nodes[index];
    if (element.closest('.curious-peeker')) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width < minWidth || rect.height < minHeight) continue;
    if (rect.height > view.height * 1.35) continue;
    if (rect.width > view.width * 0.99 && rect.height > view.height * 0.85) continue;
    if (rect.bottom < view.top + 24 || rect.top > view.bottom - 24) continue;

    const shadow = surfaceOf(element);
    if (!shadow) continue;

    spots.push({ element, rect, shadow, bulto: inflate(rect, shadow) });
  }

  return spots;
}

function readBlockedZones() {
  return [...document.querySelectorAll(BLOCKED_SELECTOR)]
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return { rect, sombra: shadowExtents(style.boxShadow) };
    })
    .filter(({ rect }) => rect.width > 0 && rect.height > 0)
    .map(({ rect, sombra }) => inflate(rect, sombra));
}

export function topEdgeOf(rect, shadow = NO_SHADOW) {
  return { line: rect.top - shadow.top, from: rect.left, to: rect.right };
}

/* Medidas de cada pose al tamaño en el que se va a ver. En la esquina, `corte`
   es lo que asoma del lienzo: 360 de 620. */
export function artBox(scale, pose = 'arriba') {
  const art = POSES[pose];
  const width = Math.round(art.size * scale);
  const height = Math.round((width * art.height) / art.width);
  const cut = art.corte ? Math.round((width * art.corte) / art.width) : width;
  return { width, height, cut, room: Math.round(height * STRETCH_ROOM) };
}

/* Coloca la ventana por la que asoma por arriba: su canto de abajo se apoya en
   el borde del escondite, y en su tramo central porque las esquinas de ROCKY se
   curvan mucho. Devuelve null cuando ese canto no le deja sitio. */
export function placeOnEdge(edge, view, scale, alongRatio) {
  const art = artBox(scale);
  const height = art.height + art.room;
  const span = edge.to - edge.from;
  if (span < art.width * 1.15) return null;

  const left = Math.round(edge.from + (span - art.width) * (0.2 + 0.6 * alongRatio));
  const top = Math.round(edge.line) - height;
  const minTop = edge.screen ? -0.5 : view.top - 0.5;
  const maxBottom = edge.screen ? view.height + 0.5 : view.bottom + 0.5;

  if (left < -0.5 || left + art.width > view.width + 0.5) return null;
  if (top < minTop || top + height > maxBottom) return null;

  return { pose: 'arriba', side: null, left, top, width: art.width, height, art };
}

/* Coloca la ventana de la esquina. Las dos reglas que no se negocian:
   el canto interior de la ventana cae sobre el lateral pintado del bloque (ahí
   es donde agarra la mano) y su canto de abajo sobre la base pintada (ahí es
   donde apoya la zapatilla). El hueco de estiramiento crece siempre hacia
   fuera, nunca hacia el bloque. */
export function placeAtCorner(rect, side, view, scale, shadow = NO_SHADOW) {
  const art = artBox(scale, 'esquina');
  const width = art.cut + art.room;
  const height = art.height + art.room;
  // El bloque tiene que dar de sí lo que el dibujo, o asomaría por encima de él
  // en vez de por su lado, y las piernas se quedarían al aire.
  if (rect.bottom - rect.top < art.height) return null;

  // El canto por el que sale es el de fuera de la sombra, no el del borde: la
  // sombra es parte del bloque y tiene que taparlo igual que él.
  const left =
    side === 'izq'
      ? Math.round(rect.left - shadow.left) - width
      : Math.round(rect.right + shadow.right);
  const top = Math.round(rect.bottom) - height;
  const placement = { pose: 'esquina', side, left, top, width, height, art };
  const huella = footprintOf(placement);

  if (huella.left < -0.5 || huella.right > view.width + 0.5) return null;
  if (huella.top < view.top - 0.5 || huella.bottom > view.bottom + 0.5) return null;

  return placement;
}

/* Lo que ocupa el muñeco de verdad. La ventana lleva además un hueco para que
   pueda estirarse, siempre por el lado por donde no hay bloque; ese aire no
   cuenta ni para pisar a otro bloque ni para caber en pantalla. */
export function footprintOf(placement) {
  const { art } = placement;
  const room = art?.room || 0;
  const left = placement.side === 'izq' ? placement.left + room : placement.left;
  return {
    left,
    right: left + (placement.pose === 'esquina' ? art.cut : placement.width),
    top: placement.top + room,
    bottom: placement.top + placement.height,
  };
}

/* Los cantos de ROCKY están dibujados a mano: las tarjetas van giradas y las
   esquinas son irregulares, así que el rectángulo del navegador cae por fuera
   del trazo y el muñeco parecería flotar. Se palpa el trazo pintado de verdad
   caminando hacia dentro del bloque y se usa el punto más hondo. */
export function probeEdge(element, rect, side, samples) {
  if (typeof document.elementFromPoint !== 'function') return 0;
  let deepest = null;

  samples.forEach((along) => {
    for (let depth = 0; depth <= MAX_PROBE; depth += 1) {
      const x =
        side === 'left'
          ? rect.left + depth
          : side === 'right'
            ? rect.right - depth
            : Math.round(along);
      const y =
        side === 'top'
          ? rect.top + depth
          : side === 'bottom'
            ? rect.bottom - depth
            : Math.round(along);
      const hit = document.elementFromPoint(Math.round(x), Math.round(y));
      if (hit && (hit === element || element.contains(hit))) {
        if (deepest === null || depth > deepest) deepest = depth;
        return;
      }
    }
  });

  return deepest ?? 0;
}

/* Palpa los cantos que toca esta colocación y devuelve cuánto hay que meterse.
   Arriba y por el lateral muerde un par de píxeles, para que las manos queden
   por delante del bloque. Por la base no muerde: la suela se apoya en la línea,
   y subirla dejaría hueco entre la zapatilla y el canto. */
export function measureBite(element, placement) {
  const rect = element.getBoundingClientRect();
  if (placement.pose === 'arriba') {
    const xs = [0.15, 0.35, 0.5, 0.65, 0.85].map(
      (f) => placement.left + placement.width * f
    );
    // Baja hasta el trazo de arriba: la ventana se mete en el bloque.
    return { x: 0, y: probeEdge(element, rect, 'top', xs) + EDGE_BITE };
  }

  const alto = placement.height;
  const ys = [0.2, 0.4, 0.6].map((f) => placement.top + alto * f);
  const lado = placement.side === 'izq' ? 'left' : 'right';
  const hacia = placement.side === 'izq' ? 1 : -1;
  const xs = [5, 12, 20].map((d) => rect[placement.side === 'izq' ? 'left' : 'right'] + d * hacia);
  // La base sube hasta el trazo pintado —en las esquinas de ROCKY se curva
  // mucho— y un píxel de vuelta para que la suela no despegue de la línea. Aquí
  // la sombra no cuenta: cae por debajo del bloque, y el muñeco ya está fuera
  // de él, así que no tiene sombra debajo sobre la que apoyarse.
  return {
    x: probeEdge(element, rect, lado, ys) + EDGE_BITE,
    y: 1 - probeEdge(element, rect, 'bottom', xs),
  };
}

/* Empuja la ventana hasta morder el canto del escondite. */
export function biteEdge(placement, bite) {
  if (!bite) return placement;
  const dx = placement.side === 'der' ? -(bite.x || 0) : bite.x || 0;
  return {
    ...placement,
    left: placement.left + dx,
    top: placement.top + (bite.y || 0),
  };
}

function overlapRatio(placement, zone) {
  const huella = footprintOf(placement);
  const ancho = Math.min(huella.right, zone.right) - Math.max(huella.left, zone.left);
  const alto = Math.min(huella.bottom, zone.bottom) - Math.max(huella.top, zone.top);
  if (ancho <= 0 || alto <= 0) return 0;
  return (ancho * alto) / ((huella.right - huella.left) * (huella.bottom - huella.top));
}

/* Prefiere escondites reales y cercanos al centro de la mirada. */
function weightOf(placement, view, fromSpot) {
  const centerY = (view.top + view.bottom) / 2;
  const distance = Math.abs(placement.top + placement.height / 2 - centerY);
  const proximity = 1 / (1 + distance / (view.height * 0.55));
  return proximity * (fromSpot ? 1.6 : 0.7);
}

export function choosePlacement({ view, scale, spots, zones, avoidKey }) {
  const candidates = [];
  // Lo que ocupa cada bloque contando su sombra: es lo que no se puede pisar.
  const bultos = spots.map((spot) => spot.bulto || spot.rect);

  const consider = (placement, spot, key, screen) => {
    if (!placement) return;
    if (zones.some((zone) => overlapRatio(placement, zone) > MAX_BLOCKED_OVERLAP)) return;
    // Si se le echa encima a otro bloque deja de parecer que está escondido.
    // Trepando por el filo de la pantalla no pasa: ahí está por delante de todo
    // y su recorte queda fuera de cuadro, así que no se le ve la costura.
    const invades =
      !screen &&
      bultos.some(
        (bulto, i) => spots[i] !== spot && overlapRatio(placement, bulto) > MAX_SPOT_OVERLAP
      );
    if (invades) return;

    candidates.push({
      ...placement,
      element: spot?.element ?? null,
      shadow: spot?.shadow ?? NO_SHADOW,
      key,
      weight: weightOf(placement, view, Boolean(spot)),
    });
  };

  spots.forEach((spot, index) => {
    const alongRatio = Math.random();
    const arriba = placeOnEdge(topEdgeOf(spot.rect, spot.shadow), view, scale, alongRatio);
    if (arriba) consider({ ...arriba, alongRatio }, spot, `${index}:arriba`, false);
    consider(placeAtCorner(spot.rect, 'izq', view, scale, spot.shadow), spot, `${index}:izq`, false);
    consider(placeAtCorner(spot.rect, 'der', view, scale, spot.shadow), spot, `${index}:der`, false);
  });

  // El filo de abajo de la pantalla también vale: entra desde fuera de cuadro.
  const alongPantalla = Math.random();
  const pantalla = placeOnEdge(
    { line: view.height, from: 0, to: view.width, screen: true },
    view,
    scale,
    alongPantalla
  );
  consider({ ...pantalla, alongRatio: alongPantalla }, null, 'pantalla', true);

  if (candidates.length === 0) return null;

  // Evita repetir escondite salvo que no haya ningún otro donde meterse.
  const fresh = candidates.filter((candidate) => candidate.key !== avoidKey);
  const pool = fresh.length > 0 ? fresh : candidates;

  const total = pool.reduce((sum, candidate) => sum + candidate.weight, 0);
  let ticket = Math.random() * total;
  return (
    pool.find((candidate) => {
      ticket -= candidate.weight;
      return ticket <= 0;
    }) || pool[pool.length - 1]
  );
}

/* Vuelve a calcular la colocación desde el rectángulo actual del escondite. */
function replace(active, view) {
  if (!active.element) return null;
  const rect = active.element.getBoundingClientRect();
  const next =
    active.pose === 'arriba'
      ? placeOnEdge(topEdgeOf(rect, active.shadow), view, active.scale, active.alongRatio)
      : placeAtCorner(rect, active.side, view, active.scale, active.shadow);
  return next ? biteEdge(next, active.bite) : null;
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
        spots: collectSpots(view),
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
        fase: -(Math.random() * IDLE_CYCLE).toFixed(2),
        mira: Math.random() < 0.5 ? 'normal' : 'reverse',
      });

      const niveles = PEEK_HIDDEN[placed.pose];
      const asoma = niveles.asoma[Math.random() < 0.6 ? 0 : 1];
      const seEstira = Math.random() < 0.65;
      const visibleFor = between(timing.visibleFor);
      revealFrame = window.requestAnimationFrame(() =>
        setPeek({ hidden: asoma, beat: 'sale' })
      );

      // Asoma lo justo y, si se confía, se estira entero antes de esconderse.
      if (seEstira) {
        leanTimer = window.setTimeout(
          () => setPeek({ hidden: niveles.entero, beat: 'estira' }),
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
  useEffect(() => {
    if (!placement?.element) return undefined;

    let frame;
    function follow() {
      const active = activeRef.current;
      const node = boxRef.current;
      if (!active || !node) return;

      const next = replace(active, readViewport());

      // Su escondite se ha ido de pantalla: se mete dentro y no vuelve a salir.
      if (!next) {
        setPeek({ hidden: TUCKED, beat: 'escapa' });
        return;
      }

      node.style.transform = `translate3d(${next.left}px, ${next.top}px, 0)`;
      frame = window.requestAnimationFrame(follow);
    }

    frame = window.requestAnimationFrame(follow);
    return () => window.cancelAnimationFrame(frame);
  }, [placement]);

  if (!placement) return null;

  const art = POSES[placement.pose];
  const esEsquina = placement.pose === 'esquina';
  // Al esconderse se mete justo lo que asoma: el alto por arriba, el ancho de
  // la franja visible por el lateral. Hacia el bloque, que es donde se tapa.
  const recorrido = esEsquina ? placement.art.cut : placement.art.height;
  const sentido = placement.side === 'der' ? -1 : 1;
  const desplazado = Math.round(peek.hidden * recorrido) * sentido;

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
          transform: esEsquina
            ? `translateX(${desplazado}px)`
            : `translateY(${desplazado}px)`,
        }}
      >
        <span className="curious-peeker-mirror">
          <img
            className="curious-peeker-art"
            src={art.src}
            width={art.width}
            height={art.height}
            style={{
              '--fase': `${placement.fase}s`,
              '--mira': placement.mira,
              width: `${placement.art.width}px`,
              ...(esEsquina
                ? { right: `${placement.art.cut - placement.art.width}px` }
                : null),
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
