import { useMemo } from 'react';
import { STEP_COUNT, TRACK_COUNT, decodePattern } from '../../../utils/beatCodec.js';

const CELL = 4;
const GAP = 1;
const WIDTH = STEP_COUNT * (CELL + GAP) - GAP;
const HEIGHT = TRACK_COUNT * (CELL + GAP) - GAP;
// Fantasma, golpe y acento, como en la mesa: cuanto más fuerte, más luz.
const OPACITY = [0, 0.4, 0.75, 1];

/* El beat de un vistazo: la rejilla de la mesa en pequeño, como una matriz
   de leds. Mientras suena, el cabezal marca el paso. */
export default function PatternThumb({ code, step = -1 }) {
  const cells = useMemo(() => {
    const pattern = decodePattern(code);
    if (!pattern) return [];
    const list = [];
    pattern.forEach((track, t) =>
      track.forEach((velocity, s) => {
        if (velocity)
          list.push({ key: `${t}-${s}`, x: s * (CELL + GAP), y: t * (CELL + GAP), velocity });
      })
    );
    return list;
  }, [code]);

  return (
    <svg
      className="pattern-thumb"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH * 2}
      height={HEIGHT * 2}
      aria-hidden="true"
      focusable="false"
    >
      {step >= 0 && (
        <rect
          className="pattern-thumb__head"
          x={step * (CELL + GAP) - 0.5}
          y={-0.5}
          width={CELL + 1}
          height={HEIGHT + 1}
        />
      )}
      {cells.map((cell) => (
        <rect
          key={cell.key}
          className="pattern-thumb__cell"
          x={cell.x}
          y={cell.y}
          width={CELL}
          height={CELL}
          rx={0.8}
          opacity={OPACITY[cell.velocity]}
        />
      ))}
    </svg>
  );
}
