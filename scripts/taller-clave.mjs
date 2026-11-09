// Genera la entrada del Taller: una clave, su hash scrypt y un secreto TOTP.
//
//   npm run taller:clave                 → inventa una clave fuerte
//   read -rs CLAVE; printf '%s' "$CLAVE" | npm run taller:clave -- --stdin
//                                         → usa la tuya (≥ 12 caracteres) sin
//                                           dejarla en el historial de la shell
//
// Imprime UNA vez la clave (guárdala en el gestor de contraseñas), las dos
// variables para el entorno del servidor y la URI otpauth:// para dar de alta
// el código en la app (Google Authenticator, 1Password, Aegis…). Nada se
// escribe en disco.

import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { hashPassword } from '../server/lib/password-hash.mjs';
import { generateTotpSecret, otpauthUri } from '../server/lib/totp.mjs';

export async function buildTallerCredentials({ password = null } = {}) {
  const clave = password ?? crypto.randomBytes(18).toString('base64url');
  const totpSecret = generateTotpSecret();
  return {
    password: clave,
    hash: await hashPassword(clave),
    totpSecret,
    uri: otpauthUri({ secret: totpSecret, issuer: 'ROCKY 035', account: 'Taller' }),
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks)
    .toString('utf8')
    .replace(/\r?\n$/, '');
}

async function main() {
  const password = process.argv.includes('--stdin') ? await readStdin() : null;
  const credentials = await buildTallerCredentials({ password });
  const lines = [
    password
      ? 'Clave: la que has escrito.'
      : `Clave (guárdala ya, no se vuelve a enseñar): ${credentials.password}`,
    '',
    'Entorno del servidor:',
    `TALLER_PASSWORD_HASH=${credentials.hash}`,
    `TALLER_TOTP_SECRET=${credentials.totpSecret}`,
    '',
    'Alta en la app de códigos (o escribe el secreto a mano):',
    credentials.uri,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
