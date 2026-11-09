import { requestJson } from './http.js';

// Los drops públicos del BFF (calendario-de-drops): { now, featured, drops }.
export function getDrops({ signal } = {}) {
  return requestJson('/api/drops', { signal });
}

export function dropCalendarUrl(handle) {
  return `/api/drops/${encodeURIComponent(handle)}/calendario.ics`;
}
