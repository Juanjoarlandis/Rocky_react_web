/* ¿El desgarro de este agotado va en espejo? Depende solo del producto (un
   hash de su handle): el mismo producto se ve siempre igual y una parrilla de
   agotados mezcla las dos variantes, sin las columnas idénticas que daba
   alternar por posición con 2 columnas. */
export function isTornFlipped(key) {
  let hash = 0;
  for (const char of String(key ?? '')) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % 2 === 1;
}
