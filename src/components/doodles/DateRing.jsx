import { RING, TICKS } from './ProductReticle';

/* La fecha del drop dentro del punto de mira (muro-de-drops): el mismo aro de
   rotulador que la mira de las fotos, con el día gordo y la hora debajo. Es
   decorativo: la fecha completa la lee el texto del cartel. */
export function DateRing({ day, time }) {
  return (
    <span className="date-ring" aria-hidden="true">
      <svg className="date-ring-aro" viewBox="0 0 100 100" focusable="false">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={RING} stroke="var(--card)" strokeWidth="9" vectorEffect="non-scaling-stroke" />
          <path d={RING} stroke="var(--accent)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
          <path d={TICKS} stroke="var(--ink)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      <span className="date-ring-dia">{day}</span>
      <span className="date-ring-hora">{time}</span>
    </span>
  );
}
