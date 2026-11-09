import { requestJson } from './http.js';

// La API de la pared compartida (pared-compartida). Leer usa el ETag a mano:
// la respuesta va con no-store y el navegador no la guarda, así que quien
// llama recuerda el último y lo manda en If-None-Match.

const ROOT = '/api/pared';
// La consulta de una pared (también la usa la limpieza de El Taller).
export const consultaPared = ({ pagina, ancho }) =>
  `pagina=${encodeURIComponent(pagina)}&ancho=${encodeURIComponent(ancho)}`;

// { estado: 'apagada' } | { estado: 'igual' } | { estado: 'ok', etag, datos }
export async function leerPared({ pagina, ancho, etag = null, signal } = {}) {
  const response = await fetch(`${ROOT}?${consultaPared({ pagina, ancho })}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(etag ? { 'If-None-Match': etag } : {}) },
    signal,
  });
  if (response.status === 304) return { estado: 'igual' };
  if (!response.ok) throw new Error(`pared ${response.status}`);
  const datos = await response.json();
  if (!datos?.enabled) return { estado: 'apagada' };
  return { estado: 'ok', etag: response.headers.get('ETag'), datos };
}

export const pintarTrazo = ({ pagina, ancho, trazo }) =>
  requestJson(`${ROOT}/trazos`, { method: 'POST', body: { pagina, ancho, trazo } });

export const deshacerTrazo = ({ pagina, ancho, id }) =>
  requestJson(`${ROOT}/trazos/${encodeURIComponent(id)}?${consultaPared({ pagina, ancho })}`, {
    method: 'DELETE',
  });

export const borrarMisTrazos = ({ pagina, ancho }) =>
  requestJson(`${ROOT}/mios?${consultaPared({ pagina, ancho })}`, { method: 'DELETE' });

export const reportarFirma = ({ pagina, ancho, firma }) =>
  requestJson(`${ROOT}/reportes`, { method: 'POST', body: { pagina, ancho, firma } });
