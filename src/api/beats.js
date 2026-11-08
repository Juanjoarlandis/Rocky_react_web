import { requestJson } from './http.js';

// El ranking de beats de La Colmena (server/http/routes/beats.mjs).

export function listBeats(orden, { signal } = {}) {
  return requestJson(`/api/beats?orden=${encodeURIComponent(orden)}`, { signal });
}

export function publishBeat(beat) {
  return requestJson('/api/beats', { method: 'POST', body: beat });
}

export function likeBeat(id) {
  return requestJson(`/api/beats/${encodeURIComponent(id)}/like`, { method: 'POST' });
}

export function reportBeat(id) {
  return requestJson(`/api/beats/${encodeURIComponent(id)}/report`, { method: 'POST' });
}

// Sólo funciona si el servidor tiene BEATS_ADMIN_TOKEN y se le da la misma.
export function removeBeat(id, token) {
  return requestJson(`/api/beats/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
