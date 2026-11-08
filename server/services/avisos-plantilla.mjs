// El correo que manda El Recadero el día del drop. Texto y HTML dicen lo
// mismo; el HTML es una tarjeta sencilla que cualquier cliente de correo
// pinta bien, sin imágenes remotas ni scripts.

const HTML_ESCAPES = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
});

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function assertHttpsUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('La URL del producto no es válida.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('La URL del producto debe ser HTTP(S).');
  }
  return url.href;
}

export function renderAvisoDrop({ titulo, url, contacto = '' }) {
  const nombre = String(titulo ?? '').trim();
  if (!nombre) throw new Error('El aviso necesita el nombre del producto.');
  const enlace = assertHttpsUrl(url);

  const subject = `Ha caído: ${nombre} ya está en ROCKY 035`;
  const despedida = contacto
    ? `Si no fuiste tú quien se apuntó, ignora este correo o escribe a ${contacto}.`
    : 'Si no fuiste tú quien se apuntó, ignora este correo.';

  const text = [
    `Recado entregado: ${nombre} acaba de caer en ROCKY 035.`,
    '',
    'Ediciones limitadas. Cuando vuelan, vuelan.',
    '',
    `Cógelo aquí: ${enlace}`,
    '',
    'Te apuntaste en rocky035.com para que te avisáramos de este drop. Es un',
    'correo de una sola vez: con este envío tu email sale de la lista.',
    despedida,
    '',
    'ROCKY 035 · Desde la Colmena',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#111111;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;">
      <tr>
        <td style="padding:32px 28px;background:#1b1b1b;border:3px solid #ffd400;border-radius:18px;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#ffd400;">Recado entregado</p>
          <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;text-transform:uppercase;">${escapeHtml(nombre)} ya está en la tienda</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">El Recadero ha llegado con tu recado: acaba de caer. Ediciones limitadas. Cuando vuelan, vuelan.</p>
          <p style="margin:0 0 28px;">
            <a href="${escapeHtml(enlace)}" style="display:inline-block;padding:14px 26px;background:#ffd400;color:#111111;font-weight:bold;text-decoration:none;border-radius:999px;text-transform:uppercase;letter-spacing:0.08em;">Cogerlo ahora</a>
          </p>
          <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#bdbdbd;">Te apuntaste en rocky035.com para que te avisáramos de este drop. Es un correo de una sola vez: con este envío tu email sale de la lista.</p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#bdbdbd;">${escapeHtml(despedida)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 8px;text-align:center;font-size:12px;color:#8a8a8a;">ROCKY 035 · Desde la Colmena</td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
