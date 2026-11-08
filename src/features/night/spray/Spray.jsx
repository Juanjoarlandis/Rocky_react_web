import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SPRAY_COLOR_NAMES,
  drawDrip,
  drawStroke,
  makeSprite,
  mulberry32,
  sprayColors,
  sprayDot,
  spraySegment,
} from './paint.js';
import { loadPage, savePage } from './sprayStore.js';
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

/* El spray del descontrol: se coge del bote flotante y se pinta sobre la
   pared (detrás del contenido, como el resto de la luz negra). La pintada se
   guarda en el navegador de quien la hace y vuelve la próxima noche; con
   «Foto» sale en una imagen con la firma de la casa para compartirla. */
export default function Spray({ pathname }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const layoutRef = useRef({ width: 0, height: 0 });
  const strokesRef = useRef([]);
  const paletteRef = useRef({ colors: [], sprites: [] });
  const drawingRef = useRef(null);
  const colorRef = useRef(0);
  const timersRef = useRef({ drip: 0, save: 0 });

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
    strokesRef.current.forEach((stroke) => drawStroke(ctx, stroke, width / 2, sprites, colors));
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
    redraw();
  }, [redraw]);

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

    const onDown = (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      event.preventDefault();
      const { x, y } = pagePoint(event);
      const { width } = layoutRef.current;
      const seed = Math.floor(Math.random() * 2 ** 32);
      const stroke = {
        c: colorRef.current,
        s: seed,
        p: [Math.round(x - width / 2), Math.round(y)],
        d: [],
      };
      strokesRef.current.push(stroke);
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
        pointerId: event.pointerId,
        stroke,
        random,
        last: { x: width / 2 + stroke.p[0], y: stroke.p[1] },
      };
      setHasPaint(true);
      setStatus('');
      armDrip();
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
    };

    const onUp = (event) => {
      const drawing = drawingRef.current;
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      drawingRef.current = null;
      window.clearTimeout(timers.drip);
      scheduleSave();
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
        drawingRef.current = null;
        scheduleSave();
      }
    };
  }, [active, scheduleSave]);

  useEffect(() => {
    if (!confirmClear) return undefined;
    const timer = window.setTimeout(() => setConfirmClear(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmClear]);

  const pickColor = (index) => {
    colorRef.current = index;
    setColor(index);
  };

  const undo = () => {
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
    setConfirmClear(false);
    setHasPaint(false);
    redraw();
    savePage(pathname, []);
    setStatus('Pared limpia.');
  };

  const photo = async () => {
    setBusy(true);
    setStatus('Revelando la foto…');
    try {
      const blob = await composeShareImage(strokesRef.current);
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

  return (
    <>
      <canvas ref={canvasRef} className="spray-wall" aria-hidden="true" data-testid="spray-wall" />
      {active ? (
        <div className="spray-tools" role="toolbar" aria-label="Spray">
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
              />
            ))}
          </div>
          <button type="button" className="spray-tool" onClick={undo} disabled={!hasPaint}>
            Deshacer
          </button>
          <button
            type="button"
            className={`spray-tool${confirmClear ? ' is-warning' : ''}`}
            onClick={clear}
            disabled={!hasPaint}
          >
            {confirmClear ? '¿Borrar todo?' : 'Borrar'}
          </button>
          <button
            type="button"
            className="spray-tool spray-tool--photo"
            onClick={photo}
            disabled={!hasPaint || busy}
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
          <p className={`spray-status${status ? '' : ' spray-status--hint'}`} role="status">
            {status || 'Pinta en la pared: se guarda sola hasta la próxima noche.'}
          </p>
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
