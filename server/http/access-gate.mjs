import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const stylesheetPath = path.join(currentDirectory, 'access-gate.css');
const ATTEMPT_LIMIT = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1_000;
const MAX_TRACKED_CLIENTS = 10_000;

const MEDIA_SPECS = Object.freeze({
  logo: { relativePath: 'logo512.png' },
  grafitero: { stem: 'grafitero-spray', extension: '.webp' },
  paquete: { stem: 'abrazando-paquete', extension: '.webp' },
  corredor: { stem: 'corriendo-bolsa', extension: '.webp' },
  'font-display': { stem: 'luckiest-guy-latin-400', extension: '.woff2' },
  'font-hand': { stem: 'fredoka-latin-300-700', extension: '.woff2' },
  'font-body': { stem: 'archivo-latin-400-800', extension: '.woff2' },
});

function setGateHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
}

export function setPrivateAccessHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
  res.vary('Cookie');
}

export function isLoopbackAddress(address = '') {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
}

function findBuiltAsset(staticDirectory, { stem, extension, relativePath }) {
  if (relativePath) {
    const candidate = path.join(staticDirectory, relativePath);
    return fs.existsSync(candidate) ? candidate : null;
  }

  const assetsDirectory = path.join(staticDirectory, 'assets');
  if (!fs.existsSync(assetsDirectory)) return null;

  const candidates = fs
    .readdirSync(assetsDirectory)
    .filter((name) => name.startsWith(`${stem}-`) && name.endsWith(extension))
    .sort((left, right) => left.length - right.length || left.localeCompare(right));
  return candidates[0] ? path.join(assetsDirectory, candidates[0]) : null;
}

function resolveGateMedia(staticDirectory) {
  return new Map(
    Object.entries(MEDIA_SPECS)
      .map(([name, spec]) => [name, findBuiltAsset(staticDirectory, spec)])
      .filter(([, filePath]) => Boolean(filePath))
  );
}

function passwordMatches(candidate, expected) {
  const candidateDigest = crypto.createHash('sha256').update(candidate).digest();
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(candidateDigest, expectedDigest);
}

function isDocumentRequest(req) {
  const acceptsHtml = (req.get('accept') || '').includes('text/html');
  return req.method === 'GET' && (req.path === '/' || acceptsHtml) && !path.extname(req.path);
}

function renderPage(message = '', messageKind = 'quiet') {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow,noarchive" />
    <meta name="theme-color" content="#faf7f0" />
    <title>ROCKY 035 — Coming soon</title>
    <link rel="icon" href="/access-gate/media/logo" />
    <link rel="stylesheet" href="/access-gate/style.css" />
  </head>
  <body>
    <main class="gate-shell">
      <header class="gate-brand" aria-label="ROCKY 035">
        <img src="/access-gate/media/logo" width="52" height="52" alt="" />
        <span>ROCKY 035</span>
      </header>

      <img
        class="gate-character gate-character--spray"
        src="/access-gate/media/grafitero"
        alt=""
        aria-hidden="true"
      />
      <img
        class="gate-character gate-character--package"
        src="/access-gate/media/paquete"
        alt=""
        aria-hidden="true"
      />
      <img
        class="gate-character gate-character--runner"
        src="/access-gate/media/corredor"
        alt=""
        aria-hidden="true"
      />

      <section class="gate-card" aria-labelledby="gate-title">
        <p class="gate-kicker">COMING SOON</p>
        <h1 id="gate-title">WE ARE COOKING</h1>
        <div class="gate-squiggle" aria-hidden="true"></div>
        <p class="gate-copy">
          La crew está preparando algo gordo.<br />
          Mete la clave si eres de la casa.
        </p>

        <form class="gate-form" method="post" action="/access-gate">
          <label for="access-password">Contraseña</label>
          <div class="gate-input-row">
            <input
              id="access-password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="La clave secreta..."
              required
              autofocus
            />
            <button type="submit">Entrar</button>
          </div>
          <p class="gate-message gate-message--${messageKind}" role="status">${message}</p>
        </form>

        <p class="gate-note">HORNEANDO DESDE LA COLMENA · 035</p>
      </section>
    </main>
  </body>
</html>`;
}

function renderClosed(res, status, message = '', messageKind = 'quiet') {
  setGateHeaders(res);
  return res.status(status).type('html').send(renderPage(message, messageKind));
}

function renderHidden(res) {
  setGateHeaders(res);
  return res.status(404).type('text/plain').send('Not found.');
}

function requestClientKey(req) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function createAttemptTracker(clock) {
  const clients = new Map();

  function pruneExpired(now) {
    for (const [key, attempt] of clients) {
      if (attempt.resetAt <= now) clients.delete(key);
    }
  }

  return {
    consume(key) {
      const now = clock();
      if (!clients.has(key) && clients.size >= MAX_TRACKED_CLIENTS) {
        pruneExpired(now);
        while (clients.size >= MAX_TRACKED_CLIENTS) {
          clients.delete(clients.keys().next().value);
        }
      }

      const previous = clients.get(key);
      const attempt =
        !previous || previous.resetAt <= now
          ? { count: 0, resetAt: now + ATTEMPT_WINDOW_MS }
          : previous;
      attempt.count += 1;
      clients.delete(key);
      clients.set(key, attempt);

      return {
        isLimited: attempt.count > ATTEMPT_LIMIT,
        retryAfterSeconds: Math.max(1, Math.ceil((attempt.resetAt - now) / 1_000)),
      };
    },

    clear(key) {
      clients.delete(key);
    },
  };
}

export function createAccessGate({
  config,
  sessions,
  staticDirectory,
  clock = () => Date.now(),
  processGrant = crypto.randomBytes(32).toString('base64url'),
}) {
  const router = express.Router();
  const media = resolveGateMedia(staticDirectory);
  const attempts = createAttemptTracker(clock);

  router.get('/style.css', (req, res) => {
    setGateHeaders(res);
    return res.type('css').sendFile(stylesheetPath);
  });

  router.get('/media/:name', (req, res) => {
    const filePath = media.get(req.params.name);
    if (!filePath) return renderHidden(res);
    setGateHeaders(res);
    return res.sendFile(filePath);
  });

  router.post(
    '/',
    express.urlencoded({ extended: false, limit: '2kb', parameterLimit: 2 }),
    async (req, res, next) => {
      try {
        const origin = req.get('origin');
        if (!origin || !config.allowedOrigins.has(origin)) {
          return renderClosed(res, 403, 'Esa entrada no vale.', 'error');
        }

        const clientKey = requestClientKey(req);
        const limit = attempts.consume(clientKey);
        if (limit.isLimited) {
          res.setHeader('Retry-After', String(limit.retryAfterSeconds));
          return renderClosed(
            res,
            429,
            'Demasiados intentos. Dale un respiro y vuelve luego.',
            'error'
          );
        }

        const candidate = typeof req.body?.password === 'string' ? req.body.password : '';
        if (!passwordMatches(candidate, config.siteAccess.password)) {
          return renderClosed(res, 401, 'No abre. Revisa la clave y prueba otra vez.', 'error');
        }

        attempts.clear(clientKey);
        await sessions.rotate(req, res, {
          siteAccessGrant: processGrant,
          siteAccessExpiresAt: clock() + config.siteAccess.sessionLifetimeMs,
        });
        setGateHeaders(res);
        return res.redirect(303, '/');
      } catch (error) {
        return next(error);
      }
    }
  );

  router.use((req, res) => renderHidden(res));

  async function requireAccess(req, res, next) {
    try {
      const session = await sessions.read(req);
      const hasAccess =
        session?.record.siteAccessGrant === processGrant &&
        Number.isFinite(session.record.siteAccessExpiresAt) &&
        session.record.siteAccessExpiresAt > clock();

      if (hasAccess) {
        setPrivateAccessHeaders(res);
        return next();
      }
      if (isDocumentRequest(req)) return renderClosed(res, 200);
      return renderHidden(res);
    } catch (error) {
      return next(error);
    }
  }

  return { router, requireAccess };
}
