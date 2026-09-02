import crypto from 'node:crypto';

// SHA-256 en base64url: la forma en que se derivan las claves del almacén
// (sesiones, perfiles Crew, transacciones OAuth) para no guardar el valor
// legible.
export function sha256Base64Url(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('base64url');
}

// SHA-256 en hexadecimal, para huellas de cuerpos crudos (webhooks).
export function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
