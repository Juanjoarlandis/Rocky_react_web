import crypto from 'node:crypto';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self'",
  "form-action 'self' https://*.myshopify.com",
  "frame-ancestors 'none'",
  "frame-src 'self' https://open.spotify.com",
  "img-src 'self' data: https:",
  "media-src 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
].join('; ');

export function securityHeaders(config) {
  return (req, res, next) => {
    res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    if (config.isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  };
}

export function requestIds() {
  return (req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  };
}

export function exactOriginPolicy(config) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (!origin) {
      return next();
    }
    if (!config.allowedOrigins.has(origin)) {
      return res.status(403).json({ message: 'Origen no permitido.' });
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Operation-Id');
      res.setHeader('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
    next();
  };
}

export function requireTrustedOrigin(config) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (!origin || !config.allowedOrigins.has(origin)) {
      return res.status(403).json({ message: 'Petición de origen no confiable.' });
    }
    next();
  };
}

function requestClientKey(req) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function createFixedWindowRateLimiter({
  max,
  windowMs,
  maxClients = 10_000,
  keyForRequest = requestClientKey,
}) {
  const clients = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = keyForRequest(req) || 'unknown';
    if (!clients.has(key) && clients.size >= maxClients) {
      for (const [clientKey, client] of clients) {
        if (client.resetAt <= now) clients.delete(clientKey);
      }
      while (clients.size >= maxClients) {
        clients.delete(clients.keys().next().value);
      }
    }
    const current = clients.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    bucket.count += 1;
    clients.delete(key);
    clients.set(key, bucket);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ message: 'Demasiadas peticiones. Inténtalo más tarde.' });
    }
    next();
  };
}
