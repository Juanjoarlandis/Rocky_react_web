import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createDemoDrops } from '../../../shared/demo-drops.mjs';
import { DROP_STATES } from '../../../shared/drops.mjs';
import { getDrops } from '../../api/drops.js';
import { errorMessage } from '../../utils/errors.js';

// Los drops en el navegador (calendario-de-drops). En Shopify los pide al BFF
// y corrige el reloj con su `now`: la cuenta atrás va con la hora del servidor,
// no con la del móvil. Cuando un anunciado llega a su hora vuelve a pedirlos (y
// avisa con onLaunch para recargar el catálogo); si el servidor aún no ha
// cambiado, reintenta a los 5 y a los 15 s. En demo usa los de demostración.

const EMPTY = Object.freeze([]);
const RETRIES_MS = [5_000, 15_000];
// Un poco de margen tras la hora, para que Shopify ya sirva los diseños.
const AFTER_LAUNCH_MS = 1_000;
// setTimeout no aguanta más de ~24,8 días: más allá se vuelve a mirar entonces.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

function nextLaunch(drops) {
  const times = drops
    .filter((drop) => drop.state === DROP_STATES.ANNOUNCED)
    .map((drop) => Date.parse(drop.launchAt))
    .filter(Number.isFinite);
  return times.length ? Math.min(...times) : null;
}

export function useDrops({ mode, products = EMPTY, onLaunch } = {}) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const offsetRef = useRef(0);
  const onLaunchRef = useRef(onLaunch);
  onLaunchRef.current = onLaunch;

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  const load = useCallback(async () => {
    try {
      const next = await getDrops();
      offsetRef.current = Date.parse(next.now) - Date.now();
      setPayload(next);
      setError('');
      return next;
    } catch (requestError) {
      setPayload({ now: new Date().toISOString(), featured: null, drops: [] });
      setError(errorMessage(requestError));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // En Shopify, la carga inicial depende solo del modo.
  useEffect(() => {
    if (mode === 'shopify') load();
  }, [mode, load]);

  // En demo (o sin tienda) se reparte el catálogo de muestra en drops.
  const isDemo = mode !== 'checking' && mode !== 'shopify';
  useEffect(() => {
    if (!isDemo) return;
    offsetRef.current = 0;
    setPayload(createDemoDrops({ products, now: new Date() }));
    setLoading(false);
  }, [isDemo, products]);

  // El siguiente lanzamiento: se vuelve a pedir al llegar su hora.
  const launchAt = payload ? nextLaunch(payload.drops) : null;
  useEffect(() => {
    if (mode !== 'shopify' || launchAt === null) return undefined;
    const timers = [];
    let cancelled = false;

    const attempt = async (retry) => {
      const next = await load();
      if (cancelled) return;
      const stillAnnounced = next && nextLaunch(next.drops) === launchAt;
      if (!stillAnnounced) {
        onLaunchRef.current?.();
        return;
      }
      if (retry < RETRIES_MS.length) {
        timers.push(setTimeout(() => attempt(retry + 1), RETRIES_MS[retry]));
      }
    };

    const wait = launchAt - serverNow() + AFTER_LAUNCH_MS;
    timers.push(
      setTimeout(
        () => (wait > MAX_TIMEOUT_MS ? load() : attempt(0)),
        Math.min(Math.max(wait, 0), MAX_TIMEOUT_MS)
      )
    );
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [mode, launchAt, load, serverNow]);

  return useMemo(
    () => ({
      drops: payload?.drops ?? EMPTY,
      featured: payload?.featured ?? null,
      loading,
      error,
      serverNow,
      reload: load,
    }),
    [payload, loading, error, serverNow, load]
  );
}
