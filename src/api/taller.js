import { ApiError, DEFAULT_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE, requestJson } from './http.js';

// La API del Taller (taller-de-drops). Todo con la cookie de la sesión; las
// mutaciones las firma el navegador con su Origin.

const ROOT = '/api/taller';

export const getSession = () => requestJson(`${ROOT}/session`);
export const login = ({ password, code }) =>
  requestJson(`${ROOT}/session`, { method: 'POST', body: { password, code } });
export const logout = () => requestJson(`${ROOT}/session`, { method: 'DELETE' });

export const listDrops = () => requestJson(`${ROOT}/drops`);
export const createDrop = (body) => requestJson(`${ROOT}/drops`, { method: 'POST', body });
export const updateDrop = (handle, body) =>
  requestJson(`${ROOT}/drops/${encodeURIComponent(handle)}`, { method: 'PATCH', body });
export const scheduleDrop = (handle) =>
  requestJson(`${ROOT}/drops/${encodeURIComponent(handle)}/schedule`, { method: 'POST', body: {} });
export const unscheduleDrop = (handle) =>
  requestJson(`${ROOT}/drops/${encodeURIComponent(handle)}/unschedule`, {
    method: 'POST',
    body: {},
  });

export const createDesign = (handle, body) =>
  requestJson(`${ROOT}/drops/${encodeURIComponent(handle)}/designs`, { method: 'POST', body });
export const updateDesign = (productId, body) =>
  requestJson(`${ROOT}/designs/${encodeURIComponent(productId)}`, { method: 'PATCH', body });
export const addExistingDesign = (handle, productId) =>
  requestJson(`${ROOT}/drops/${encodeURIComponent(handle)}/designs/existing`, {
    method: 'POST',
    body: { productId },
  });
export const removeDesign = (handle, productId) =>
  requestJson(
    `${ROOT}/drops/${encodeURIComponent(handle)}/designs/${encodeURIComponent(productId)}`,
    { method: 'DELETE' }
  );
export const searchProducts = (q) => requestJson(`${ROOT}/products?q=${encodeURIComponent(q)}`);

/* Sube una imagen tal cual (binario, con su tipo). Devuelve { fileId, url }. */
export async function uploadImage(file, alt = '') {
  let response;
  try {
    response = await fetch(`${ROOT}/images?alt=${encodeURIComponent(alt)}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        Accept: 'application/json',
      },
      body: file,
    });
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, { status: 503, code: 'NETWORK_ERROR' });
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.message || DEFAULT_ERROR_MESSAGE, {
      status: response.status,
      code: data?.code || 'REQUEST_FAILED',
      body: data,
    });
  }
  return data;
}
