import crypto from 'node:crypto';

// Verificación HMAC-SHA256 del cuerpo crudo con comparación en tiempo
// constante. Se hace sobre los bytes exactos, antes de parsear nada.
export function verifyWebhookHmac(rawBody, providedHmac, secret) {
  if (!Buffer.isBuffer(rawBody) || !providedHmac || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  let provided;
  try {
    provided = Buffer.from(providedHmac, 'base64');
  } catch {
    return false;
  }
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}
