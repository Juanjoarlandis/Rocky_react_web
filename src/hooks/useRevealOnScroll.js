import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../utils/media.js';

/* Revela piezas a medida que entran en pantalla, sin tocar el DOM por
   detrás de React: cada pieza lleva data-reveal-id y este hook devuelve
   el conjunto de ids ya vistos. Con movimiento reducido, sin
   IntersectionObserver o sin contenedor, todo cuenta como revelado. */
export function useRevealOnScroll(containerRef, { rootMargin = '0px 0px 5% 0px' } = {}) {
  const [revealed, setRevealed] = useState(() => new Set());
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || prefersReducedMotion() || typeof IntersectionObserver !== 'function') {
      setAnimated(false);
      return undefined;
    }
    const pieces = [...container.querySelectorAll('[data-reveal-id]')];
    if (!pieces.length) return undefined;
    setAnimated(true);

    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target.dataset.revealId);
        if (!seen.length) return;
        seen.forEach((id) => {
          const piece = pieces.find((candidate) => candidate.dataset.revealId === id);
          if (piece) observer.unobserve(piece);
        });
        setRevealed((current) => {
          const next = new Set(current);
          seen.forEach((id) => next.add(id));
          return next;
        });
      },
      { rootMargin, threshold: 0 }
    );
    pieces.forEach((piece) => observer.observe(piece));
    return () => observer.disconnect();
  }, [containerRef, rootMargin]);

  return { revealed, animated };
}
