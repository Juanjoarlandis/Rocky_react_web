import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DROP_STATES, isOnSale } from '../../../shared/drops.mjs';
import { getDrops } from '../../api/drops.js';
import { errorMessage } from '../../utils/errors.js';

// Los drops en el navegador (calendario-de-drops). En Shopify los pide al BFF
// y corrige el reloj con su `now`: la cuenta atrás va con la hora del servidor,
// no con la del móvil. Al llegar la próxima frontera (un lanzamiento o el cierre
// de un drop a la venta) vuelve a pedirlos; si el servidor aún no ha cambiado
// o falla, reintenta a los 5, 15 y 60 s sin vaciar el muro. Cuando cambian,
// avisa con onLaunch para recargar el catálogo, y repite el aviso a los 5, 15 y
// 35 s: Shopify tarda un poco en servir lo que publica con fecha. En demo usa
// los de demostración; si no se sabe qué tienda hay (unavailable), ninguno.

const EMPTY = Object.freeze([]);
const EMPTY_PAYLOAD = Object.freeze({ now: null, featured: null, drops: EMPTY });
const RETRIES_MS = [5_000, 15_000, 60_000];
const CATALOG_RETRIES_MS = [5_000, 15_000, 35_000];
// Un poco de margen tras la hora, para que Shopify ya sirva los diseños.
const AFTER_BOUNDARY_MS = 1_000;
// setTimeout no aguanta más de ~24,8 días: más allá se vuelve a mirar entonces.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/* La próxima hora en la que algo cambia de verdad: un anunciado que cae o un
   drop a la venta que cierra. */
function nextBoundary(drops) {
  const times = drops
    .map((drop) => {
      if (drop.state === DROP_STATES.ANNOUNCED) return Date.parse(drop.launchAt);
      if (isOnSale(drop.state) && drop.endsAt) return Date.parse(drop.endsAt);
      return NaN;
    })
    .filter(Number.isFinite);
  return times.length ? Math.min(...times) : null;
}

const loadDemoDrops = () => import('../../../shared/demo-drops.mjs');

export function useDrops({ mode, products = EMPTY, onLaunch } = {}) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const offsetRef = useRef(0);
  const onLaunchRef = useRef(onLaunch);
  onLaunchRef.current = onLaunch;
  const catalogTimers = useRef([]);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  const load = useCallback(async () => {
    try {
      const next = await getDrops();
      offsetRef.current = Date.parse(next.now) - Date.now();
      setPayload(next);
      setError('');
      return next;
    } catch (requestError) {
      // Un fallo no borra lo que ya se ve: solo la primera carga se queda vacía.
      setPayload((current) => current ?? EMPTY_PAYLOAD);
      setError(errorMessage(requestError));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // El catálogo se recarga al cambiar algo y otra vez al rato. Estos avisos
  // viven fuera del efecto de la frontera, que se rehace al cambiar los drops.
  const announce = useCallback(() => {
    onLaunchRef.current?.();
    for (const delay of CATALOG_RETRIES_MS) {
      catalogTimers.current.push(setTimeout(() => onLaunchRef.current?.(), delay));
    }
  }, []);
  useEffect(() => () => catalogTimers.current.forEach(clearTimeout), []);

  // En Shopify, la carga inicial depende solo del modo.
  useEffect(() => {
    if (mode === 'shopify') load();
  }, [mode, load]);

  // En demo se reparte el catálogo de muestra en drops; sin tienda, nada. El
  // reparto solo hace falta sin Shopify: su código se pide entonces, como el
  // catálogo de muestra, y no viaja en la carga inicial de la tienda real.
  const isDemo = mode === 'demo';
  useEffect(() => {
    if (isDemo) {
      let cancelled = false;
      loadDemoDrops()
        .then(({ createDemoDrops }) => {
          if (cancelled) return;
          offsetRef.current = 0;
          setPayload(createDemoDrops({ products, now: new Date() }));
        })
        .catch(() => {
          if (!cancelled) setPayload((current) => current ?? EMPTY_PAYLOAD);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }
    if (mode === 'unavailable') {
      setPayload(EMPTY_PAYLOAD);
      setLoading(false);
    }
    return undefined;
  }, [isDemo, mode, products]);

  // La próxima frontera: se vuelve a pedir al llegar su hora.
  const boundary = payload ? nextBoundary(payload.drops) : null;
  useEffect(() => {
    if (mode !== 'shopify' || boundary === null) return undefined;
    const timers = [];
    let cancelled = false;

    const attempt = async (retry) => {
      const next = await load();
      if (next && nextBoundary(next.drops) !== boundary) {
        announce();
        return;
      }
      if (cancelled) return;
      if (retry < RETRIES_MS.length) {
        timers.push(setTimeout(() => attempt(retry + 1), RETRIES_MS[retry]));
      }
    };

    const wait = boundary - serverNow() + AFTER_BOUNDARY_MS;
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
  }, [mode, boundary, load, serverNow, announce]);

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
