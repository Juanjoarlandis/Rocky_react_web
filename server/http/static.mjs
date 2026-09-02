import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { setPrivateAccessHeaders } from './access-gate.mjs';

const IMMUTABLE_ASSET_CACHE = 'public, max-age=31536000, immutable';
const IMMUTABLE_EDGE_CACHE = 'public, max-age=31536000';
const REVALIDATED_PUBLIC_CACHE = 'public, max-age=14400, must-revalidate';
const REVALIDATED_EDGE_CACHE = 'public, max-age=14400';
const REVALIDATED_DOCUMENT_CACHE = 'public, max-age=0, must-revalidate';

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
  app.use('/assets', (req, res) => {
    setUncachedHeaders(res);
    return res.status(404).type('text/plain').send('Asset not found.');
  });
  app.use(
    express.static(staticDirectory, {
      index: false,
      fallthrough: true,
      setHeaders(res, filePath) {
        if (filePath === indexPath) {
          setSpaDocumentHeaders(res, isPrivate);
          return;
        }
        setStablePublicHeaders(res, isPrivate);
      },
    })
  );
  app.use('/products', (req, res, next) => {
    if (!/\.(?:avif|jpe?g|png|webp)$/i.test(req.path)) return next();
    setUncachedHeaders(res);
    return res.status(404).type('text/plain').send('Product asset not found.');
  });
  app.get('*', (req, res) => {
    setSpaDocumentHeaders(res, isPrivate);
    return res.sendFile(indexPath);
  });
  return true;
}
