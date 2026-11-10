import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { setPrivateAccessHeaders } from './access-gate.mjs';

const IMMUTABLE_ASSET_CACHE = 'public, max-age=31536000, immutable';
const IMMUTABLE_EDGE_CACHE = 'public, max-age=31536000';
const REVALIDATED_PUBLIC_CACHE = 'public, max-age=14400, must-revalidate';
const REVALIDATED_EDGE_CACHE = 'public, max-age=14400';
const REVALIDATED_DOCUMENT_CACHE = 'public, max-age=0, must-revalidate';

// Sufijo de cada variante que deja scripts/precompress.mjs, en orden de preferencia.
const VARIANTS = Object.freeze([
  ['br', '.br'],
  ['gzip', '.gz'],
]);

/* Qué codificación servir: Brotli si la petición lo acepta, gzip si no, y
   null (el original) en cualquier otro caso. `available` dice qué variantes
   existen. Respeta los valores q: `br;q=0` no acepta Brotli. */
export function preferredEncoding(acceptEncoding, available) {
  const accepted = new Map();
  for (const part of String(acceptEncoding ?? '').split(',')) {
    const [rawName, ...parameters] = part.toLowerCase().split(';');
    const name = rawName.trim();
    if (!name) continue;
    const q = parameters
      .map((parameter) => parameter.replace(/\s+/g, ''))
      .find((p) => p.startsWith('q='));
    const weight = q === undefined ? 1 : Number(q.slice(2));
    accepted.set(name, Number.isFinite(weight) ? weight : 0);
  }
  for (const [encoding] of VARIANTS) {
    const weight = accepted.get(encoding) ?? accepted.get('*') ?? 0;
    if (available[encoding] && weight > 0) return encoding;
  }
  return null;
}

/* Índice de qué ficheros de dist/ tienen variantes, leído una sola vez del
   disco: { '/assets/app.js' → { br, gzip } }. Una petición solo recibe una
   variante si su ruta está aquí; nada de la petición se concatena a una ruta. */
function indexVariants(directory, prefix = '', index = new Map()) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const names = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));
  for (const entry of entries) {
    if (entry.isDirectory()) {
      indexVariants(path.join(directory, entry.name), `${prefix}/${entry.name}`, index);
    } else if (entry.isFile()) {
      const available = Object.fromEntries(
        VARIANTS.map(([encoding, suffix]) => [encoding, names.has(`${entry.name}${suffix}`)])
      );
      if (Object.values(available).some(Boolean)) index.set(`${prefix}/${entry.name}`, available);
    }
  }
  return index;
}

const suffixOf = (encoding) => VARIANTS.find(([name]) => name === encoding)[1];

function setEncodedHeaders(res, originalPath, encoding) {
  // serve-static pondría el tipo de la variante (.br); manda el del original.
  res.type(path.extname(originalPath));
  res.setHeader('Content-Encoding', encoding);
}

/* Delante de cada express.static: si el recurso pedido tiene variantes y la
   petición acepta alguna, cambia la URL a la de la variante. serve-static
   sigue ocupándose de rangos, HEAD y revalidación, y como cada variante es un
   fichero distinto, cada codificación tiene su propio ETag. */
function negotiateEncoding(variants, mountPath = '') {
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let pathname;
    try {
      pathname = decodeURIComponent(req.path);
    } catch {
      return next();
    }
    const available = variants.get(`${mountPath}${pathname}`);
    if (!available) return next();
    res.vary('Accept-Encoding');
    const encoding = preferredEncoding(req.headers['accept-encoding'], available);
    if (!encoding) return next();
    const query = req.url.slice(req.path.length);
    res.locals.urlBeforeEncoding = req.url;
    req.url = `${req.path}${suffixOf(encoding)}${query}`;
    setEncodedHeaders(res, pathname, encoding);
    return next();
  };
}

/* Detrás de cada express.static: si llega aquí es que la variante elegida no
   se ha servido (ha desaparecido del disco con el servidor en marcha). Se
   deshace la negociación para que lo que responda después no herede la
   codificación ni el tipo de la variante. */
function undoEncoding(req, res, next) {
  if (res.locals.urlBeforeEncoding) {
    req.url = res.locals.urlBeforeEncoding;
    res.locals.urlBeforeEncoding = null;
    res.removeHeader('Content-Encoding');
    res.removeHeader('Content-Type');
  }
  next();
}

function setSpaDocumentHeaders(res, isPrivate) {
  if (isPrivate) {
    setPrivateAccessHeaders(res);
    return;
  }
  res.setHeader('Cache-Control', REVALIDATED_DOCUMENT_CACHE);
  res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
}

function setStablePublicHeaders(res, isPrivate) {
  if (isPrivate) {
    setPrivateAccessHeaders(res);
    return;
  }
  res.setHeader('Cache-Control', REVALIDATED_PUBLIC_CACHE);
  res.setHeader('Cloudflare-CDN-Cache-Control', REVALIDATED_EDGE_CACHE);
}

function setUncachedHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
}

// Sirve dist/: assets con hash inmutables, ficheros públicos estables con
// revalidación, y el index.html como fallback de la SPA. Un asset o mockup
// que no existe termina en 404 sin caché en lugar de caer al index.
export function mountStaticApp(app, { staticDirectory, isPrivate = false }) {
  const indexPath = path.join(staticDirectory, 'index.html');
  if (!fs.existsSync(indexPath)) return false;
  const variants = indexVariants(staticDirectory);
  // setHeaders recibe la ruta del fichero servido, que puede ser una variante.
  const isIndexFile = (filePath) =>
    filePath === indexPath || VARIANTS.some(([, suffix]) => filePath === `${indexPath}${suffix}`);

  app.use('/assets', negotiateEncoding(variants, '/assets'));
  app.use(
    '/assets',
    express.static(path.join(staticDirectory, 'assets'), {
      index: false,
      fallthrough: true,
      setHeaders(res) {
        if (isPrivate) {
          setPrivateAccessHeaders(res);
          return;
        }
        res.setHeader('Cache-Control', IMMUTABLE_ASSET_CACHE);
        res.setHeader('Cloudflare-CDN-Cache-Control', IMMUTABLE_EDGE_CACHE);
      },
    })
  );
  app.use('/assets', undoEncoding);
  app.use('/assets', (req, res) => {
    setUncachedHeaders(res);
    return res.status(404).type('text/plain').send('Asset not found.');
  });
  app.use(negotiateEncoding(variants));
  app.use(
    express.static(staticDirectory, {
      index: false,
      fallthrough: true,
      setHeaders(res, filePath) {
        if (isIndexFile(filePath)) {
          setSpaDocumentHeaders(res, isPrivate);
          return;
        }
        setStablePublicHeaders(res, isPrivate);
      },
    })
  );
  app.use(undoEncoding);
  app.use('/products', (req, res, next) => {
    if (!/\.(?:avif|jpe?g|png|webp)$/i.test(req.path)) return next();
    setUncachedHeaders(res);
    return res.status(404).type('text/plain').send('Product asset not found.');
  });
  const indexVariantsAvailable = variants.get('/index.html');
  app.get('*', (req, res) => {
    setSpaDocumentHeaders(res, isPrivate);
    if (!indexVariantsAvailable) return res.sendFile(indexPath);
    res.vary('Accept-Encoding');
    const encoding = preferredEncoding(req.headers['accept-encoding'], indexVariantsAvailable);
    if (!encoding) return res.sendFile(indexPath);
    setEncodedHeaders(res, indexPath, encoding);
    return res.sendFile(`${indexPath}${suffixOf(encoding)}`, (error) => {
      if (!error || res.headersSent) return;
      res.removeHeader('Content-Encoding');
      res.sendFile(indexPath);
    });
  });
  return true;
}
