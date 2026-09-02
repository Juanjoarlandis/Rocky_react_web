// GEOMETRÍA DEL MUÑECO CURIOSO — funciones puras, sin tocar el DOM.
// Aquí se decide dónde cabe el muñeco y por qué canto se agarra; medir la
// página es cosa de `domProbe.js`, y el tiempo, del componente.

/* Dos poses, cada una hecha para un canto distinto de un bloque de la página.

   - `arriba`: El Curioso se agarra al filo de arriba y saca la cabeza. El
     dibujo termina en su borde inferior, así que ese corte se apoya en el canto
     y no se ve. Nunca se gira: tumbado quedaría con la cara torcida.
   - `esquina`: El Cotilla se asoma por un lateral, apoyado en la base del
     bloque. La mano de dentro agarra el canto vertical justo en x = 360 del
     lienzo de 620x820, y las piernas y los pies se quedan detrás del bloque.
     Por eso sólo se enseña la franja 0..360 y el resto se recorta.

   Sólo las medidas del lienzo: la imagen de cada pose la pone el componente. */
export const POSES = Object.freeze({
  arriba: { width: 767, height: 600, size: 104 },
  esquina: { width: 620, height: 820, cut: 360, size: 106 },
});

/* Hueco por los lados por los que no hay bloque, para que pueda estirarse al
   salir sin que la ventana le corte el gorro. */
const STRETCH_ROOM = 0.12;
// Las sombras de ROCKY son bloques de tinta de 2 a 9 px; se acota por si algún
// día aparece un desenfoque enorme que lo mandaría lejísimos del bloque.
const MAX_SHADOW = 24;
export const NO_SHADOW = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
// Cuánto puede solaparse con otro bloque antes de dejar de parecer escondido.
const MAX_SPOT_OVERLAP = 0.3;
const MAX_BLOCKED_OVERLAP = 0.2;

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/* Cuánto sobresale la sombra por cada lado. En ROCKY son bloques de tinta
   duros desplazados abajo y a la derecha, y forman parte del bloque: si se
   ignoran, el muñeco se dibuja por encima de la sombra en vez de salir de
   detrás de ella. `elementFromPoint` no las ve, así que hay que leerlas. */
export function shadowExtents(boxShadow) {
  const none = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!boxShadow || boxShadow === 'none') return none;

  // El color puede llevar comas: se aparta antes de separar las capas.
  const layers = boxShadow.replace(/\b\w+\([^)]*\)/g, '').split(',');
  return layers.reduce((acc, layer) => {
    if (layer.includes('inset')) return acc;
    const lengths = (layer.match(/-?[\d.]+px/g) || []).map(parseFloat);
    if (lengths.length < 2) return acc;
    const [dx, dy, blur = 0, spread = 0] = lengths;
    const halo = blur + spread;
    const cap = (value) => clamp(Math.round(value), 0, MAX_SHADOW);
    return {
      top: Math.max(acc.top, cap(halo - dy)),
      right: Math.max(acc.right, cap(halo + dx)),
      bottom: Math.max(acc.bottom, cap(halo + dy)),
      left: Math.max(acc.left, cap(halo - dx)),
    };
  }, none);
}

/* ¿El primer rectángulo se traga al segundo? */
export function contains(outer, inner) {
  return (
    outer.left <= inner.left + 1 && outer.right >= inner.right - 1 &&
    outer.top <= inner.top + 1 && outer.bottom >= inner.bottom - 1
  );
}

/* El bloque más su sombra: es lo que hay que respetar para no pisarlo. */
export function inflate(rect, shadow) {
  return {
    left: rect.left - shadow.left,
    right: rect.right + shadow.right,
    top: rect.top - shadow.top,
    bottom: rect.bottom + shadow.bottom,
  };
}

export function topEdgeOf(rect, shadow = NO_SHADOW) {
  return { line: rect.top - shadow.top, from: rect.left, to: rect.right };
}

/* Medidas de cada pose al tamaño en el que se va a ver. En la esquina, `cut`
   es lo que asoma del lienzo: 360 de 620. */
export function artBox(scale, pose = 'arriba') {
  const art = POSES[pose];
  const width = Math.round(art.size * scale);
  const height = Math.round((width * art.height) / art.width);
  const cut = art.cut ? Math.round((width * art.cut) / art.width) : width;
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
  // Y tiene que ser bastante más ancho que lo que él saca por el canto: al lado
  // de un cromo de 145 px, un señor asomándose rompe la escala.
  if (rect.right - rect.left < art.cut * 3) return null;

  const left =
    side === 'izq'
      ? Math.round(rect.left - shadow.left) - width
      : Math.round(rect.right + shadow.right);
  const top = Math.round(rect.bottom) - height;
  const placement = { pose: 'esquina', side, left, top, width, height, art };
  const footprint = footprintOf(placement);

  if (footprint.left < -0.5 || footprint.right > view.width + 0.5) return null;
  if (footprint.top < view.top - 0.5 || footprint.bottom > view.bottom + 0.5) return null;

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

export function overlapRatio(placement, zone) {
  const footprint = footprintOf(placement);
  const width = Math.min(footprint.right, zone.right) - Math.max(footprint.left, zone.left);
  const height = Math.min(footprint.bottom, zone.bottom) - Math.max(footprint.top, zone.top);
  if (width <= 0 || height <= 0) return 0;
  return (
    (width * height) /
    ((footprint.right - footprint.left) * (footprint.bottom - footprint.top))
  );
}

/* Prefiere escondites reales y cercanos al centro de la mirada. */
function weightOf(placement, view, fromSpot) {
  const centerY = (view.top + view.bottom) / 2;
  const distance = Math.abs(placement.top + placement.height / 2 - centerY);
  const proximity = 1 / (1 + distance / (view.height * 0.55));
  return proximity * (fromSpot ? 1.6 : 0.7);
}

/* Elige dónde asomarse entre los escondites medidos (`spots`, con su `rect`,
   su sombra, su `bulk` y si valen `topOnly`) y las zonas vetadas (`zones`). */
export function choosePlacement({ view, scale, spots, zones, avoidKey }) {
  const candidates = [];
  // Lo que ocupa cada bloque contando su sombra: es lo que no se puede pisar.
  const bulks = spots.map((spot) => spot.bulk || spot.rect);

  const consider = (placement, spot, key, screen) => {
    if (!placement) return;
    if (zones.some((zone) => overlapRatio(placement, zone) > MAX_BLOCKED_OVERLAP)) return;
    // Si se le echa encima a otro bloque deja de parecer que está escondido.
    // Trepando por el filo de la pantalla no pasa: ahí está por delante de todo
    // y su recorte queda fuera de cuadro, así que no se le ve la costura.
    // Pisar otro bloque delata que no está escondido. No cuenta el bloque que
    // contiene a su escondite —si se asoma por la franja interior de una
    // tarjeta, salir por encima de esa tarjeta es justo lo que toca—.
    const invades =
      !screen &&
      bulks.some((bulk, i) => {
        if (spots[i] === spot) return false;
        if (spot && contains(spots[i].rect, spot.rect)) return false;
        return overlapRatio(placement, bulk) > MAX_SPOT_OVERLAP;
      });
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
    const top = placeOnEdge(topEdgeOf(spot.rect, spot.shadow), view, scale, alongRatio);
    if (top) consider({ ...top, alongRatio }, spot, `${index}:arriba`, false);
    // Las franjas interiores sólo tienen pintado el canto de arriba.
    if (spot.topOnly) return;
    consider(placeAtCorner(spot.rect, 'izq', view, scale, spot.shadow), spot, `${index}:izq`, false);
    consider(placeAtCorner(spot.rect, 'der', view, scale, spot.shadow), spot, `${index}:der`, false);
  });

  // El filo de abajo de la pantalla también vale: entra desde fuera de cuadro.
  const alongScreen = Math.random();
  const screen = placeOnEdge(
    { line: view.height, from: 0, to: view.width, screen: true },
    view,
    scale,
    alongScreen
  );
  consider({ ...screen, alongRatio: alongScreen }, null, 'pantalla', true);

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
