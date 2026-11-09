import { useEffect, useState } from 'react';

/* La hora del servidor (corregida por useDrops), refrescada cada `intervalMs`.
   La cuenta atrás va al segundo; el estado del cartel, cada medio minuto. */
export function useServerTime(serverNow, { intervalMs = 1_000, enabled = true } = {}) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    if (!enabled) return undefined;
    setNow(serverNow());
    const id = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(id);
  }, [serverNow, intervalMs, enabled]);
  return now;
}
