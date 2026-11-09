// Las fechas de los drops se cuentan siempre en la hora de Madrid, y se dice
// (calendario-de-drops): un drop cae a la misma hora para todo el mundo.

const ZONA = 'Europe/Madrid';

const partes = (iso, opciones) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('es-ES', { timeZone: ZONA, ...opciones })
      .formatToParts(new Date(iso))
      .map(({ type, value }) => [type, value])
  );

/* «viernes 13 de noviembre» */
export function fechaLarga(iso) {
  const { weekday, day, month } = partes(iso, { weekday: 'long', day: 'numeric', month: 'long' });
  return `${weekday} ${day} de ${month}`;
}

/* «20:00» */
export function horaDeMadrid(iso) {
  const { hour, minute } = partes(iso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${hour}:${minute}`;
}

/* «13·11», para el aro del cartel y las pestañas. */
export function fechaCorta(iso) {
  const { day, month } = partes(iso, { day: 'numeric', month: 'numeric' });
  return `${day}·${month}`;
}

export function fechaAccesible(iso) {
  return `Sale el ${fechaLarga(iso)} a las ${horaDeMadrid(iso)}, hora de Madrid.`;
}

/* Lo que le queda a un drop en últimas horas: horas hasta dos días, después días. */
export function quedan(ms) {
  if (ms <= 0) return 'se acaba ya';
  const horas = Math.floor(ms / 3_600_000);
  if (horas < 1) return `quedan ${Math.max(1, Math.floor(ms / 60_000))} min`;
  if (horas < 48) return `quedan ${horas} h`;
  return `quedan ${Math.floor(ms / 86_400_000)} días`;
}
