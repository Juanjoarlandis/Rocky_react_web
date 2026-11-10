import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SPRAY_COLOR_NAMES,
  atenuar,
  drawDrip,
  drawStroke,
  drawTag,
  firmaEn,
  makeSprite,
  mulberry32,
  posicionesDeFirmas,
  sprayColors,
  sprayDot,
  spraySegment,
} from './paint.js';
import { loadPage, savePage } from './sprayStore.js';
import { useParedCompartida } from './useParedCompartida.js';
import { traquetear } from './rattle.js';
import { STORAGE_KEYS } from '../../../config/storageKeys.js';
import { readStorage, writeStorage } from '../../../utils/storage.js';
import { composeShareImage, shareOrDownload } from './shareImage.js';
import { prefersReducedMotion } from '../../../utils/media.js';
import '../../../styles/components/spray.css';

// Lo que no se pinta: todo lo que se pulsa, escribe o arrastra por su cuenta.
const INTERACTIVE =
  'a, button, input, textarea, select, label, summary, iframe, [role="button"], [role="slider"], [contenteditable="true"], .navbar, .spray-tools';
// Techo de píxeles del lienzo: la pared puede medir miles de píxeles de alto
// y en iOS un canvas no pasa de ~16 millones. El spray es difuso de por sí:
// si hace falta se pinta a menos resolución y el navegador lo estira.
const MAX_CANVAS_PIXELS = 12_000_000;
const DRIP_AFTER_MS = 450;
const DRIP_GROW_MS = 900;
const SAVE_AFTER_MS = 300;
// Un trazo no pasa de 600 puntos (el tope del servidor): uno largo se parte
// en dos sin que se note, el segundo arranca donde acaba el primero.
const MAX_PUNTOS = 600;
// A partir de este ancho se pinta en la pared «ancha» de la página.
const ANCHO_PARED = 900;
const anchoDePared = (width) => (width >= ANCHO_PARED ? 'ancha' : 'estrecha');

function SprayCanIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="7" y="9" width="8" height="12" rx="2" />
        <path d="M9 9 V6.5 H13 V9 M10 6.5 V4.5 H12" />
      </g>
      <g fill="currentColor">
        <circle cx="17.5" cy="4" r="1" />
        <circle cx="20" cy="6" r="1" />
        <circle cx="19.5" cy="2.5" r="0.8" />
      </g>
    </svg>
  );
}

// Un bote de spray: tapa, boquilla, cuerpo del color (--spray-color) y su
// etiqueta. La nube de pintura solo se ve en el que se tiene cogido.
function Bote() {
  return (
    <svg
      className="spray-bote"
      viewBox="0 0 26 44"
      width="26"
      height="44"
      aria-hidden="true"
      focusable="false"
    >
      <g className="spray-bote-nube">
        <circle cx="20.5" cy="3.6" r="1.6" />
        <circle cx="24" cy="6.2" r="1.2" />
        <circle cx="23.2" cy="1.6" r="1" />
      </g>
      <rect className="spray-bote-tapa" x="10.5" y="3" width="5" height="4.5" rx="1" />
      <path className="spray-bote-tapa" d="M7 12.5 Q7 7.5 13 7.5 Q19 7.5 19 12.5 Z" />
      <rect className="spray-bote-cuerpo" x="4" y="12" width="18" height="30" rx="3.5" />
      <rect className="spray-bote-etiqueta" x="5" y="21.5" width="16" height="10" />
      <circle className="spray-bote-punto" cx="13" cy="26.5" r="2.6" />
    </svg>
  );
}

/* El spray del descontrol: se coge del bote flotante y se pinta sobre la
   pared (detrás del contenido, como el resto de la luz negra). Con la pared
   compartida encendida, cada trazo se sube y lo ve todo el que pase de noche,
   firmado con el tag que da el servidor (pared-compartida); si está apagada o
   no responde, se guarda en el navegador como siempre. Lo pintado antes de la
   pared compartida se queda solo en el navegador de quien lo pintó. Con
   «Foto» sale una imagen con la firma de la casa para compartirla. */
export default function Spray({ pathname }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const layoutRef = useRef({ width: 0, height: 0 });
  const strokesRef = useRef([]);
  const paletteRef = useRef({ colors: [], sprites: [] });
  const drawingRef = useRef(null);
  const colorRef = useRef(0);
  const timersRef = useRef({ drip: 0, save: 0 });
  // La pared común: lo que llega del servidor, lo que se está subiendo y la
  // pila de lo propio de esta visita para «Deshacer».
  const [ancho, setAncho] = useState(() =>
    anchoDePared(typeof document === 'undefined' ? 0 : document.documentElement.clientWidth)
  );
  const pared = useParedCompartida({ pagina: pathname, ancho });
  const paredRef = useRef(pared);
  paredRef.current = pared;
  const sharedRef = useRef([]);
  const pendingRef = useRef([]);
  const historialRef = useRef([]);
  const [modoReporte, setModoReporte] = useState(false);
  const modoReporteRef = useRef(false);
  modoReporteRef.current = modoReporte;
  const [aReportar, setAReportar] = useState(null);
  const [avisoVisto, setAvisoVisto] = useState(() => Boolean(readStorage(STORAGE_KEYS.paredAviso)));
  // La firma de la lista que se está mirando: lo suyo se destaca en la pared
  // para saber qué pintó. El cursor y el foco van por separado (perder el foco
  // no apaga lo que señala el cursor) y manda el cursor. Si esa firma ya no
  // está en la pared (la crew la ha borrado), no hay nada que destacar.
  const [conCursor, setConCursor] = useState(null);
  const [conFoco, setConFoco] = useState(null);
  const pedida = conCursor ?? conFoco;
  const resaltada = pared.firmas.some((entrada) => entrada.firma === pedida) ? pedida : null;
  const resaltadaRef = useRef(null);
  resaltadaRef.current = resaltada;
  const cursorRef = useRef({ timer: 0, firma: null });

  const [active, setActive] = useState(false);
  const [color, setColor] = useState(0);
  const [hasPaint, setHasPaint] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const redraw = useCallback(() => {
    const ctx = ctxRef.current;
    const { width, height } = layoutRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const { colors, sprites } = paletteRef.current;
    const centro = width / 2;
    // Lo antiguo del navegador debajo; encima la pared común con sus firmas y,
    // arriba del todo, lo que aún se está subiendo.
    strokesRef.current.forEach((stroke) => drawStroke(ctx, stroke, centro, sprites, colors));
    sharedRef.current.forEach((stroke) => drawStroke(ctx, stroke, centro, sprites, colors));
    const fuente =
      getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() ||
      'sans-serif';
    // Los sitios de las firmas se calculan una vez con la pared entera: al
    // destacar una, su firma se repinta donde estaba, no donde caería sola.
    const sitios = posicionesDeFirmas(sharedRef.current, centro, width);
    const firmar = (lista) =>
      lista.forEach(({ firma, x, y, c }) => {
        drawTag(ctx, firma, x, y, colors[c] ?? colors[0], fuente);
      });
    firmar(sitios);
    // Con una firma destacada, todo lo demás se atenúa y lo suyo se repinta
    // encima a toda luz.
    const destacada = resaltadaRef.current;
    if (destacada) {
      atenuar(ctx, width, height);
      sharedRef.current
        .filter((stroke) => stroke.firma === destacada)
        .forEach((stroke) => drawStroke(ctx, stroke, centro, sprites, colors));
      firmar(sitios.filter((sitio) => sitio.firma === destacada));
    }
    pendingRef.current.forEach((stroke) => drawStroke(ctx, stroke, centro, sprites, colors));
  }, []);

  // El lienzo mide lo que la página (el .app); si cambia, se rehace y repinta.
  const layout = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const app = canvas.closest('.app');
    const width = document.documentElement.clientWidth;
    const height = Math.max(window.innerHeight, app?.offsetHeight ?? 0);
    if (width === layoutRef.current.width && height === layoutRef.current.height) return;
    const scale = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)));
    canvas.width = Math.max(1, Math.floor(width * scale));
    canvas.height = Math.max(1, Math.floor(height * scale));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctxRef.current = ctx;
    layoutRef.current = { width, height };
    setAncho(anchoDePared(width));
    redraw();
  }, [redraw]);

  // Al cruzar los 900 px se pasa a la otra pared: lo de «Deshacer» de esta
  // visita era de la anterior.
  useEffect(() => {
    historialRef.current = [];
  }, [ancho]);

  // La pared común cambia (llega, se pinta, se deshace): se repinta.
  useEffect(() => {
    sharedRef.current = pared.strokes;
    redraw();
  }, [pared.strokes, redraw]);

  // Cambia la firma destacada (o se suelta el spray): se repinta.
  useEffect(() => {
    redraw();
  }, [resaltada, redraw]);

  // Con el cursor se espera a que se pare un momento en la fila: recorrer la
  // lista no repinta la pared entera (que puede ser grande) en cada fila. Y
  // solo cuenta el cursor que se mueve: si la lista se abre debajo de un
  // cursor quieto, la pared no se atenúa sola.
  const apuntar = useCallback((firma) => {
    const cursor = cursorRef.current;
    if (cursor.firma === firma) return;
    cursor.firma = firma;
    window.clearTimeout(cursor.timer);
    if (firma === null) {
      setConCursor(null);
      return;
    }
    cursor.timer = window.setTimeout(() => setConCursor(firma), 80);
  }, []);

  const soltarDestacado = useCallback(() => {
    apuntar(null);
    setConFoco(null);
  }, [apuntar]);

  useEffect(() => {
    if (!active) soltarDestacado();
  }, [active, soltarDestacado]);

  useEffect(() => {
    const cursor = cursorRef.current;
    return () => window.clearTimeout(cursor.timer);
  }, []);

  const scheduleSave = useCallback(() => {
    window.clearTimeout(timersRef.current.save);
    timersRef.current.save = window.setTimeout(
      () => savePage(pathname, strokesRef.current),
      SAVE_AFTER_MS
    );
  }, [pathname]);

  // Cada página, sus pintadas.
  useEffect(() => {
    const colors = sprayColors();
    paletteRef.current = { colors, sprites: colors.map((value) => makeSprite(value)) };
    strokesRef.current = loadPage(pathname);
    pendingRef.current = [];
    historialRef.current = [];
    setHasPaint(strokesRef.current.length > 0);
    // Sin medida previa, layout() rehace el lienzo y repinta sí o sí.
    layoutRef.current = { width: 0, height: 0 };
    layout();
    const app = canvasRef.current?.closest('.app');
    let frame = 0;
    const onResize = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        layout();
      });
    };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
    if (app) observer?.observe(app);
    window.addEventListener('resize', onResize);
    const timers = timersRef.current;
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(timers.drip);
      if (timers.save) {
        window.clearTimeout(timers.save);
        savePage(pathname, strokesRef.current);
      }
    };
  }, [pathname, layout, redraw]);

  // Con el spray en la mano: cursor de boquilla, sin selección de texto y sin
  // scroll táctil (el dedo pinta). Escape lo suelta.
  useEffect(() => {
    if (!active) return undefined;
    const html = document.documentElement;
    html.classList.add('is-spraying');
    const onKey = (event) => {
      if (event.key === 'Escape') setActive(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      html.classList.remove('is-spraying');
      window.removeEventListener('keydown', onKey);
    };
  }, [active]);

  // Un trazo terminado: a la pared común si está encendida; si no, o si la
  // subida falla, al navegador como siempre.
  const terminarTrazo = useCallback(
    (stroke, compartido) => {
      if (!compartido) {
        historialRef.current.push({ tipo: 'local' });
        scheduleSave();
        return;
      }
      const trazo = { c: stroke.c, s: stroke.s, p: [...stroke.p], d: [...stroke.d] };
      // Si la subida falla después de cambiar de página, el trazo vuelve a la
      // página donde se pintó, no a la nueva.
      const destino = strokesRef.current;
      const pagina = pathname;
      paredRef.current
        .pintar(trazo)
        .then(({ id }) => {
          pendingRef.current = pendingRef.current.filter((s) => s !== stroke);
          historialRef.current.push({ tipo: 'compartido', id });
          writeStorage(STORAGE_KEYS.paredAviso, '1');
          setAvisoVisto(true);
        })
        .catch(() => {
          pendingRef.current = pendingRef.current.filter((s) => s !== stroke);
          if (strokesRef.current !== destino) {
            savePage(pagina, [...loadPage(pagina), stroke]);
            return;
          }
          strokesRef.current.push(stroke);
          historialRef.current.push({ tipo: 'local' });
          setHasPaint(true);
          scheduleSave();
          redraw();
          setStatus('No se ha podido pegar en la pared común: se queda en tu navegador.');
        });
    },
    [pathname, redraw, scheduleSave]
  );

  // La mano: pintar, dejar chorretones al pararse y guardar al soltar.
  useEffect(() => {
    if (!active) return undefined;
    const timers = timersRef.current;

    const pagePoint = (event) => ({ x: event.clientX, y: event.clientY + window.scrollY });

    const growDrip = (x, y, length, colorValue) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (prefersReducedMotion()) {
        drawDrip(ctx, x, y, 0, length, colorValue);
        return;
      }
      const start = performance.now();
      let drawn = 0;
      const tick = (now) => {
        const target = Math.min(1, (now - start) / DRIP_GROW_MS) * length;
        const done = target >= length;
        drawDrip(ctx, x, y, drawn, target, colorValue, done);
        drawn = target;
        if (!done) window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    };

    const armDrip = () => {
      window.clearTimeout(timers.drip);
      timers.drip = window.setTimeout(() => {
        const drawing = drawingRef.current;
        if (!drawing) return;
        const { width } = layoutRef.current;
        const length = Math.round(24 + Math.random() * 46);
        drawing.stroke.d.push([Math.round(drawing.last.x - width / 2), drawing.last.y, length]);
        growDrip(
          drawing.last.x,
          drawing.last.y,
          length,
          paletteRef.current.colors[drawing.stroke.c]
        );
      }, DRIP_AFTER_MS);
    };

    const empezarTrazo = (x, y, pointerId) => {
      const ctx = ctxRef.current;
      const { width } = layoutRef.current;
      const seed = Math.floor(Math.random() * 2 ** 32);
      const stroke = {
        c: colorRef.current,
        s: seed,
        p: [Math.round(x - width / 2), Math.round(y)],
        d: [],
      };
      const compartido = paredRef.current.compartida === true;
      (compartido ? pendingRef : strokesRef).current.push(stroke);
      const random = mulberry32(seed);
      const { colors, sprites } = paletteRef.current;
      sprayDot(
        ctx,
        width / 2 + stroke.p[0],
        stroke.p[1],
        sprites[stroke.c],
        colors[stroke.c],
        random
      );
      drawingRef.current = {
        pointerId,
        stroke,
        compartido,
        random,
        last: { x: width / 2 + stroke.p[0], y: stroke.p[1] },
      };
      if (!compartido) setHasPaint(true);
      setStatus('');
      armDrip();
    };

    const onDown = (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
      if (!ctxRef.current) return;
      event.preventDefault();
      const { x, y } = pagePoint(event);
      // Reportar señalando: la firma cuya pintada cubre el punto
      if (modoReporteRef.current) {
        const { width } = layoutRef.current;
        const firma = firmaEn(sharedRef.current, width / 2, { x, y });
        const mia = paredRef.current.firma;
        setAReportar(firma && firma !== mia ? firma : null);
        setStatus(firma && firma !== mia ? '' : 'Ahí no hay ninguna pintada ajena.');
        return;
      }
      empezarTrazo(x, y, event.pointerId);
    };

    const onMove = (event) => {
      const drawing = drawingRef.current;
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      const ctx = ctxRef.current;
      const { width } = layoutRef.current;
      const { x, y } = pagePoint(event);
      const px = Math.round(x - width / 2);
      const py = Math.round(y);
      const nx = width / 2 + px;
      if (Math.hypot(nx - drawing.last.x, py - drawing.last.y) < 1.5) return;
      drawing.stroke.p.push(px, py);
      const { colors, sprites } = paletteRef.current;
      const c = drawing.stroke.c;
      spraySegment(
        ctx,
        drawing.last.x,
        drawing.last.y,
        nx,
        py,
        sprites[c],
        colors[c],
        drawing.random
      );
      drawing.last = { x: nx, y: py };
      armDrip();
      // Al tope de puntos: se cierra este trazo y sigue otro desde aquí.
      if (drawing.stroke.p.length >= MAX_PUNTOS * 2) {
        window.clearTimeout(timers.drip);
        drawingRef.current = null;
        terminarTrazo(drawing.stroke, drawing.compartido);
        empezarTrazo(nx, py, drawing.pointerId);
      }
    };

    const onUp = (event) => {
      const drawing = drawingRef.current;
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      drawingRef.current = null;
      window.clearTimeout(timers.drip);
      terminarTrazo(drawing.stroke, drawing.compartido);
    };

    window.addEventListener('pointerdown', onDown, { capture: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.clearTimeout(timers.drip);
      if (drawingRef.current) {
        const { stroke, compartido } = drawingRef.current;
        drawingRef.current = null;
        terminarTrazo(stroke, compartido);
      }
    };
  }, [active, terminarTrazo]);

  useEffect(() => {
    if (!confirmClear) return undefined;
    const timer = window.setTimeout(() => setConfirmClear(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmClear]);

  const pickColor = (index) => {
    // Coger otro bote suena; el que ya se tenía, no.
    if (index !== colorRef.current) traquetear();
    colorRef.current = index;
    setColor(index);
  };

  // Lo propio en la pared común: lo que lleva la firma de esta sesión.
  const misCompartidos = pared.strokes.filter((s) => pared.firma && s.firma === pared.firma);
  const puedeDeshacer = hasPaint || misCompartidos.length > 0;

  const undo = () => {
    // Primero lo último de esta visita; si no hay, lo último propio de la
    // pared común y, al final, lo guardado en el navegador.
    const ultimo = historialRef.current.pop();
    const idCompartido =
      ultimo?.tipo === 'compartido' ? ultimo.id : !ultimo ? misCompartidos.at(-1)?.id : null;
    if (idCompartido) {
      pared.deshacer(idCompartido).catch(() => setStatus('No se ha podido deshacer.'));
      return;
    }
    strokesRef.current.pop();
    setHasPaint(strokesRef.current.length > 0);
    redraw();
    savePage(pathname, strokesRef.current);
  };

  const clear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    strokesRef.current = [];
    historialRef.current = [];
    setConfirmClear(false);
    setHasPaint(false);
    redraw();
    savePage(pathname, []);
    setStatus('Pared limpia.');
    if (pared.compartida) {
      pared
        .borrarMios()
        .catch(() => setStatus('No se ha podido borrar lo tuyo de la pared común.'));
    }
  };

  const reportar = (firma) => {
    setAReportar(null);
    setModoReporte(false);
    pared
      .reportar(firma)
      .then(() => setStatus(`Gracias: revisaremos lo de ${firma}.`))
      .catch(() => setStatus('No se ha podido enviar el reporte.'));
  };

  const photo = async () => {
    setBusy(true);
    setStatus('Revelando la foto…');
    try {
      // Solo lo propio: lo del navegador, lo que se está subiendo y lo que lleva
      // la firma de esta sesión. Lo ajeno no sale en una foto con nuestra marca.
      const blob = await composeShareImage([
        ...strokesRef.current,
        ...pendingRef.current,
        ...misCompartidos,
      ]);
      if (!blob) {
        setStatus('Pinta algo primero.');
        return;
      }
      const result = await shareOrDownload(blob);
      setStatus(
        result === 'downloaded'
          ? 'Foto descargada: súbela a Instagram y etiqueta a @rocky035.'
          : result === 'shared'
            ? 'Foto enviada.'
            : ''
      );
    } catch {
      setStatus('No se ha podido hacer la foto.');
    } finally {
      setBusy(false);
    }
  };

  const colors = paletteRef.current.colors;
  const pista =
    pared.compartida === true
      ? avisoVisto
        ? 'Pinta en la pared: la ve todo el que pasa de noche.'
        : 'Ojo: lo que pintes aquí lo verá todo el que pase de noche, firmado con un tag que te damos (nunca tu nombre).'
      : pared.compartida === false
        ? 'La pared común no está: lo que pintes no se comparte y se queda en tu navegador.'
        : 'Pinta en la pared: se guarda sola hasta la próxima noche.';

  return (
    <>
      <canvas ref={canvasRef} className="spray-wall" aria-hidden="true" data-testid="spray-wall" />
      {active ? (
        <div className="spray-tools" role="toolbar" aria-label="Spray">
          <div className="spray-fila">
            <div className="spray-colors" role="radiogroup" aria-label="Color del spray">
              {SPRAY_COLOR_NAMES.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={color === index}
                  aria-label={name}
                  title={name}
                  className={`spray-color${color === index ? ' is-active' : ''}`}
                  style={{ '--spray-color': colors[index] }}
                  onClick={() => pickColor(index)}
                >
                  <Bote />
                </button>
              ))}
            </div>
            <button type="button" className="spray-tool" onClick={undo} disabled={!puedeDeshacer}>
              Deshacer
            </button>
            <button
              type="button"
              className={`spray-tool${confirmClear ? ' is-warning' : ''}`}
              onClick={clear}
              disabled={!puedeDeshacer}
            >
              {confirmClear ? '¿Borrar todo?' : 'Borrar'}
            </button>
            <button
              type="button"
              className="spray-tool spray-tool--photo"
              onClick={photo}
              disabled={!puedeDeshacer || busy}
            >
              Foto
            </button>
            <button
              type="button"
              className="spray-tool spray-tool--close"
              onClick={() => setActive(false)}
              aria-label="Soltar el spray"
              title="Soltar el spray (Esc)"
            >
              ✕
            </button>
            {pared.compartida && (
              <button
                type="button"
                className={`spray-tool${modoReporte ? ' is-warning' : ''}`}
                onClick={() => {
                  setModoReporte((actual) => !actual);
                  setAReportar(null);
                  setStatus(modoReporte ? '' : 'Pincha en la pintada que quieras reportar.');
                }}
                aria-pressed={modoReporte}
              >
                Reportar
              </button>
            )}
          </div>
          {aReportar && (
            <div className="spray-reporte" role="group" aria-label="Reportar una pintada">
              <button
                type="button"
                className="spray-tool is-warning"
                onClick={() => reportar(aReportar)}
              >
                Reportar {aReportar}
              </button>
              <button type="button" className="spray-tool" onClick={() => setAReportar(null)}>
                Cancelar
              </button>
            </div>
          )}
          <p className={`spray-status${status ? '' : ' spray-status--hint'}`} role="status">
            {status || pista}
          </p>
          {pared.compartida && pared.firmas.length > 0 && (
            <details
              className="spray-firmas"
              onToggle={(event) => {
                if (!event.currentTarget.open) soltarDestacado();
              }}
            >
              <summary>Firmas en esta pared ({pared.firmas.length})</summary>
              <ul>
                {pared.firmas.map(({ firma, mia }) => (
                  <li
                    key={firma}
                    className={resaltada === firma ? 'is-resaltada' : undefined}
                    onPointerMove={() => apuntar(firma)}
                    onPointerLeave={() => apuntar(null)}
                    onFocus={() => setConFoco(firma)}
                    onBlur={() => setConFoco(null)}
                  >
                    {mia ? (
                      <span>{firma} (tú)</span>
                    ) : (
                      <>
                        <span>{firma}</span>
                        <button
                          type="button"
                          className="spray-tool spray-tool--mini"
                          onClick={() => reportar(firma)}
                          aria-label={`Reportar ${firma}`}
                        >
                          Reportar
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="spray-fab"
          onClick={() => setActive(true)}
          aria-label="Coge el spray"
        >
          <SprayCanIcon />
          <span aria-hidden="true">Coge el spray</span>
        </button>
      )}
    </>
  );
}
