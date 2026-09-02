export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Un valor al azar dentro de un rango [min, max].
export function between([min, max]) {
  return min + Math.random() * (max - min);
}
