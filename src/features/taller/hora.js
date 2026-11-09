// El Taller pide las fechas en la hora de Madrid (un <input type="datetime-local">,
// sin zona) y el calendario las guarda en ISO con su zona. Aquí se pasa de una
// a otra contando el horario de verano.

const ZONA = 'Europe/Madrid';

/* Desfase de Madrid (en minutos) en un instante dado. */
function desfase(instante) {
  const nombre = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, timeZoneName: 'longOffset' })
    .formatToParts(new Date(instante))
    .find((part) => part.type === 'timeZoneName').value;
  const match = nombre.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutos = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutos : minutos;
}

const zona = (minutos) => {
  const signo = minutos < 0 ? '-' : '+';
  const abs = Math.abs(minutos);
  return `${signo}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
};

/* «2026-11-12T20:00» (hora de Madrid) → «2026-11-12T20:00:00+01:00». */
export function horaMadridAIso(local) {
  if (!local) return null;
  const [fecha, hora] = local.split('T');
  const comoUtc = Date.parse(`${fecha}T${hora}:00Z`);
  // El desfase se mira dos veces: la primera estimación puede caer al otro
  // lado de un cambio de hora.
  let minutos = desfase(comoUtc);
  minutos = desfase(comoUtc - minutos * 60_000);
  return `${fecha}T${hora}:00${zona(minutos)}`;
}

/* Cualquier ISO → «2026-11-12T20:00» en la hora de Madrid, para el campo. */
export function isoAHoraMadrid(iso) {
  if (!iso) return '';
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map(({ type, value }) => [type, value])
  );
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}
