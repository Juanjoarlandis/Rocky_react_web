import { describe, expect, it } from 'vitest';
import {
  dropIcs,
  escapeIcsText,
  foldIcsLine,
  googleCalendarUrl,
  hasLaunchDate,
} from './drop-calendar.mjs';

const DROP = {
  handle: 'rocky-drop-4',
  shortTitle: 'Drop 4',
  launchAt: '2026-10-10T20:00:00+02:00',
  launchMinutes: 60,
};
const ORIGIN = 'https://rocky035.com';

describe('El drop en el calendario', () => {
  it('sin fecha no hay evento', () => {
    expect(hasLaunchDate({ ...DROP, launchAt: null })).toBe(false);
    expect(dropIcs({ ...DROP, launchAt: null }, { origin: ORIGIN })).toBeNull();
    expect(googleCalendarUrl({ ...DROP, launchAt: 'mañana' }, { origin: ORIGIN })).toBeNull();
  });

  it('el .ics lleva el lanzamiento en UTC, sus dos avisos y líneas CRLF', () => {
    const ics = dropIcs(DROP, { origin: ORIGIN, now: new Date('2026-09-26T10:00:00Z') });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261010T180000Z');
    expect(ics).toContain('DTEND:20261010T190000Z');
    expect(ics).toContain('DTSTAMP:20260926T100000Z');
    expect(ics).toContain('UID:rocky-drop-4@rocky035.com');
    expect(ics).toContain('SUMMARY:ROCKY 035 · Drop 4');
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('TRIGGER:-PT1H');
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/);
  });

  it('escapa el texto y dobla las líneas largas sin partir letras', () => {
    expect(escapeIcsText('Cuando vuelan, vuelan; ya\nsabes')).toBe(
      'Cuando vuelan\\, vuelan\\; ya\\nsabes'
    );
    const folded = foldIcsLine(`DESCRIPTION:${'ñ'.repeat(80)}`);
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(lines.slice(1).every((line) => line.startsWith(' '))).toBe(true);
  });

  it('Google Calendar recibe las mismas horas', () => {
    const url = new URL(googleCalendarUrl(DROP, { origin: ORIGIN }));
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('dates')).toBe('20261010T180000Z/20261010T190000Z');
    expect(url.searchParams.get('text')).toBe('ROCKY 035 · Drop 4');
  });
});
