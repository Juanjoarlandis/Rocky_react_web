import { useEffect, useState } from 'react';
import { REDUCED_MOTION, matches } from '../utils/media.js';

// Sigue el ajuste del sistema en vivo, no sólo al montar.
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => matches(REDUCED_MOTION));
  useEffect(() => {
    const media = globalThis.matchMedia?.(REDUCED_MOTION);
    if (!media?.addEventListener) return undefined;
    const onChange = (event) => setReduced(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
