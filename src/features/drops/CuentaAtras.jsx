import { countdownParts } from '../../../shared/drops.mjs';
import { useServerTime } from './useServerTime.js';

const dos = (value) => String(value).padStart(2, '0');

/* La cuenta atrás a rotulador: cuatro casillas con lo que falta, contado con la
   hora del servidor. Es visual (aria-hidden): la fecha completa la lee el texto
   del cartel, que no cambia cada segundo. */
export default function CuentaAtras({ target, serverNow }) {
  const now = useServerTime(serverNow, { intervalMs: 1_000 });
  const { days, hours, minutes, seconds, done } = countdownParts(Date.parse(target) - now);
  if (done) {
    return (
      <p className="cuenta cuenta--ya" aria-hidden="true">
        ¡Cayendo!
      </p>
    );
  }
  return (
    <p className="cuenta" aria-hidden="true">
      <span className="cuenta-casilla">
        {dos(days)}
        <small>d</small>
      </span>
      <span className="cuenta-casilla">
        {dos(hours)}
        <small>h</small>
      </span>
      <span className="cuenta-casilla">
        {dos(minutes)}
        <small>m</small>
      </span>
      <span className="cuenta-casilla cuenta-casilla--seg">
        {dos(seconds)}
        <small>s</small>
      </span>
    </p>
  );
}
