import { useId, useState } from 'react';
import { scribblePath } from './scribble.js';

// Lo que asoma el borde blanco del corrector a cada lado del brochazo, y el filo
// de tinta que lo separa del día (blanco sobre crema no se ve).
const RIM = 12;
const EDGE = 2;

/* El garabato que tapa la pantalla al cambiar de modo. Se calcula una vez con
   el tamaño de la ventana al montarse; la capa vive menos de un segundo y
   medio. Colores y animación en descontrol.css.

   - `marker`: rotulador de tinta que tapa la pantalla al encender.
   - `tippex`: al apagar, la noche es un rectángulo con máscara; los brochazos
     le abren agujeros por los que se ve el día de verdad, y el borde blanco
     que asoma alrededor es el corrector. */
export default function ModeStroke({ variant }) {
  const maskId = useId();
  // scribblePath devuelve también el tamaño saneado: el viewBox nunca queda en 0 × 0.
  const [shape] = useState(() => scribblePath(window.innerWidth, window.innerHeight));
  const { d, strokeWidth, width, height } = shape;
  const svgProps = {
    className: `mode-stroke mode-stroke--${variant}`,
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
    focusable: 'false',
  };

  if (variant !== 'tippex') {
    return (
      <svg {...svgProps}>
        <path className="mode-stroke-draw" d={d} pathLength="1" strokeWidth={strokeWidth} />
      </svg>
    );
  }

  return (
    <svg {...svgProps}>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
          <rect width={width} height={height} fill="white" />
          <path
            className="mode-stroke-draw mode-stroke-hole"
            d={d}
            pathLength="1"
            strokeWidth={strokeWidth}
          />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <rect className="mode-stroke-night" width={width} height={height} />
        <path
          className="mode-stroke-draw mode-stroke-rim"
          d={d}
          pathLength="1"
          strokeWidth={strokeWidth + RIM}
        />
        <path
          className="mode-stroke-draw mode-stroke-edge"
          d={d}
          pathLength="1"
          strokeWidth={strokeWidth + EDGE}
        />
      </g>
    </svg>
  );
}
