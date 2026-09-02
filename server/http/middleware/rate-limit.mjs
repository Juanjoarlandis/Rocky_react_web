function requestClientKey(req) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Ventana fija en memoria, por proceso. Con un tope de clientes rastreados
// para que un barrido de IPs no la haga crecer sin límite.
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
    const bucket =
      !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;

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
