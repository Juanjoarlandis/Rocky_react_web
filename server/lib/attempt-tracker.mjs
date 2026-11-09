// Cuenta intentos por cliente en una ventana fija y en memoria, con un tope de
// clientes para que no crezca sin límite. Lo usan la puerta de acceso y la
// entrada del Taller.

export function createAttemptTracker({
  limit,
  windowMs,
  maxClients = 10_000,
  clock = () => Date.now(),
}) {
  const clients = new Map();

  function pruneExpired(now) {
    for (const [key, attempt] of clients) {
      if (attempt.resetAt <= now) clients.delete(key);
    }
  }

  return {
    consume(key) {
      const now = clock();
      if (!clients.has(key) && clients.size >= maxClients) {
        pruneExpired(now);
        while (clients.size >= maxClients) {
          clients.delete(clients.keys().next().value);
        }
      }

      const previous = clients.get(key);
      const attempt =
        !previous || previous.resetAt <= now ? { count: 0, resetAt: now + windowMs } : previous;
      attempt.count += 1;
      clients.delete(key);
      clients.set(key, attempt);

      return {
        isLimited: attempt.count > limit,
        retryAfterSeconds: Math.max(1, Math.ceil((attempt.resetAt - now) / 1_000)),
      };
    },

    clear(key) {
      clients.delete(key);
    },

    size() {
      return clients.size;
    },
  };
}
