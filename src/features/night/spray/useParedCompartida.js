import { useCallback, useEffect, useRef, useState } from 'react';
import {
  borrarMisTrazos,
  deshacerTrazo,
  leerPared,
  pintarTrazo,
  reportarFirma,
} from '../../../api/pared.js';

// LA PARED COMPARTIDA en el navegador (pared-compartida, design.md D4).
// Lee la pared de la página y del ancho, y vuelve a mirar cada 20 s mientras
// la pestaña está visible, con el ETag para no traer lo mismo. `compartida`
// vale null mientras se sabe, true si la pared común está encendida y false si
// está apagada o no responde: entonces el spray vuelve a ser solo local.

const CADA_MS = 20_000;
const VACIA = Object.freeze([]);

export function useParedCompartida({ pagina, ancho }) {
  const [compartida, setCompartida] = useState(null);
  const [pared, setPared] = useState({ strokes: VACIA, firmas: VACIA, firma: null });
  const etagRef = useRef(null);
  // Cuenta lo que este navegador cambia (pintar, deshacer, borrar): un vistazo
  // que salió antes de un cambio llega con la pared vieja y se descarta.
  const cambiosRef = useRef(0);

  const mirar = useCallback(
    async (signal) => {
      if (typeof fetch !== 'function') {
        setCompartida(false);
        return;
      }
      const cambios = cambiosRef.current;
      try {
        const resultado = await leerPared({ pagina, ancho, etag: etagRef.current, signal });
        if (cambiosRef.current !== cambios) return;
        // Sin cambios, pero la pared está: tras un fallo pasajero vuelve a compartir.
        if (resultado.estado === 'igual') {
          setCompartida(true);
          return;
        }
        if (resultado.estado === 'apagada') {
          etagRef.current = null;
          setCompartida(false);
          setPared({ strokes: VACIA, firmas: VACIA, firma: null });
          return;
        }
        etagRef.current = resultado.etag;
        const { strokes, firmas, firma } = resultado.datos;
        setPared({ strokes, firmas, firma });
        setCompartida(true);
      } catch (error) {
        if (error?.name === 'AbortError') return;
        // Sin ETag, el próximo vistazo trae la pared entera y vuelve a encender.
        etagRef.current = null;
        setCompartida(false);
      }
    },
    [pagina, ancho]
  );

  // Cada página y cada ancho, su pared; y un vistazo cada 20 s.
  useEffect(() => {
    const controller = new AbortController();
    etagRef.current = null;
    mirar(controller.signal);
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      mirar(controller.signal);
    }, CADA_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [mirar]);

  const pintar = useCallback(
    async (trazo) => {
      const { id, firma } = await pintarTrazo({ pagina, ancho, trazo });
      cambiosRef.current += 1;
      setPared((actual) => ({
        ...actual,
        firma,
        strokes: [...actual.strokes, { ...trazo, id, firma }],
        firmas: actual.firmas.some((entrada) => entrada.firma === firma)
          ? actual.firmas
          : [...actual.firmas, { firma, mia: true }],
      }));
      etagRef.current = null;
      return { id, firma };
    },
    [pagina, ancho]
  );

  const deshacer = useCallback(
    async (id) => {
      await deshacerTrazo({ pagina, ancho, id });
      cambiosRef.current += 1;
      setPared((actual) => ({ ...actual, strokes: actual.strokes.filter((s) => s.id !== id) }));
      etagRef.current = null;
    },
    [pagina, ancho]
  );

  const borrarMios = useCallback(async () => {
    await borrarMisTrazos({ pagina, ancho });
    cambiosRef.current += 1;
    setPared((actual) => ({
      ...actual,
      strokes: actual.strokes.filter((s) => s.firma !== actual.firma),
      firmas: actual.firmas.filter((entrada) => !entrada.mia),
    }));
    etagRef.current = null;
  }, [pagina, ancho]);

  const reportar = useCallback(
    (firma) => reportarFirma({ pagina, ancho, firma }),
    [pagina, ancho]
  );

  return { compartida, ...pared, pintar, deshacer, borrarMios, reportar };
}
