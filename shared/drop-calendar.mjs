// El lanzamiento del drop como evento de calendario: un .ics (Apple,
// Outlook, cualquier calendario) con dos avisos, y el enlace de Google
// Calendar. Todo en UTC, que es lo que entienden todos sin líos de zonas.

const DAY_ALARM = '-P1D';
const HOUR_ALARM = '-PT1H';

function utcStamp(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

// Texto de iCalendar: se escapan barra, punto y coma, coma y saltos de línea.
export function escapeIcsText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Las líneas de un .ics no pasan de 75 octetos: se doblan con CRLF + espacio,
// sin partir un carácter de varios bytes por la mitad.
export function foldIcsLine(line) {
  const encoder = new TextEncoder();
  const chunks = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = chunks.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      chunks.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  chunks.push(current);
  return chunks.join('\r\n ');
}

function launchWindow(drop) {
  if (!drop?.launchAt) return null;
  const start = new Date(drop.launchAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + (drop.launchMinutes || 60) * 60_000);
  return { start, end };
}

export function hasLaunchDate(drop) {
  return launchWindow(drop) !== null;
}

const eventUrl = (drop, origin) => `${origin}${drop.path ?? '/'}`;

function eventCopy(drop, origin) {
  return {
    summary: `ROCKY 035 · ${drop.shortTitle}`,
    description: `Sale el ${drop.shortTitle} de ROCKY 035. Cuando vuelan, vuelan.\n${eventUrl(drop, origin)}`,
  };
}

/* Un drop público (shared/drops.mjs) tal como lo entiende el calendario: el
   evento enlaza a la página del drop. */
export function calendarDrop(drop) {
  return {
    handle: drop.handle,
    shortTitle: `Drop ${drop.number}`,
    launchAt: drop.launchAt,
    launchMinutes: 60,
    path: `/products/${drop.handle}`,
  };
}

export function dropIcs(drop, { origin, now = new Date() }) {
  const slot = launchWindow(drop);
  if (!slot) return null;
  const { summary, description } = eventCopy(drop, origin);
  const alarm = (trigger, text) => [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(text)}`,
    `TRIGGER:${trigger}`,
    'END:VALARM',
  ];
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ROCKY 035//Drops//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${drop.handle}@${new URL(origin).hostname}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(slot.start)}`,
    `DTEND:${utcStamp(slot.end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${eventUrl(drop, origin)}`,
    ...alarm(DAY_ALARM, `Mañana sale el ${drop.shortTitle} de ROCKY 035`),
    ...alarm(HOUR_ALARM, `En una hora sale el ${drop.shortTitle} de ROCKY 035`),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

export function googleCalendarUrl(drop, { origin }) {
  const slot = launchWindow(drop);
  if (!slot) return null;
  const { summary, description } = eventCopy(drop, origin);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: summary,
    dates: `${utcStamp(slot.start)}/${utcStamp(slot.end)}`,
    details: description,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
