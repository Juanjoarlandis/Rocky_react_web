// matchMedia sin sustos: en tests y en navegadores antiguos devuelve false.
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export function matches(query) {
  return globalThis.matchMedia?.(query).matches ?? false;
}

export function prefersReducedMotion() {
  return matches(REDUCED_MOTION);
}
