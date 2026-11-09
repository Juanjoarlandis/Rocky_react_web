import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../../api/taller.js';
import { drawStroke, makeSprite, sprayColors, strokeBounds } from '../night/spray/paint.js';
import BotonConfirmar from './BotonConfirmar';

// LA PARED EN EL TALLER (moderacion-de-la-pared): ver cada pared con lo que
// tiene pintado, sus firmas y sus reportes; ocultar, volver a mostrar o borrar
// lo de una firma; limpiar una pared y apagar la pared compartida al momento.

const separar = (pared) => {
  const corte = pared.lastIndexOf('|');
  return { pagina: pared.slice(0, corte), ancho: pared.slice(corte + 1) };
};

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function textoEstado({ configurada, encendida, corrupta }) {
  if (!configurada) return 'Apagada por configuración (falta SHARED_WALL_ENABLED en el servidor).';
  if (corrupta)
    return 'Apagada: su fichero no se pudo leer. Al encenderla se aparta y empieza de cero.';
  return encendida
    ? 'Encendida: lo que se pinta lo ve todo el mundo.'
    : 'Apagada: el spray solo guarda en cada navegador.';
}

/* La pared en pequeño: lo visible a todo color y lo oculto, apagado. */
function VistaPrevia({ strokes }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    // Siempre se limpia: una pared vacía no debe enseñar la vista anterior.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (strokes.length === 0) return;
    const cajas = strokes.map((stroke) => strokeBounds(stroke, 0));
    const minX = Math.min(...cajas.map((c) => c.minX));
    const maxX = Math.max(...cajas.map((c) => c.maxX));
    const minY = Math.min(...cajas.map((c) => c.minY));
    const maxY = Math.max(...cajas.map((c) => c.maxY));
    const escala = Math.min(
      1,
      canvas.width / Math.max(1, maxX - minX),
      canvas.height / Math.max(1, maxY - minY)
    );
    const colors = sprayColors();
    const sprites = colors.map((value) => makeSprite(value));
    const pintar = (destino, lista) => {
      destino.save();
      destino.scale(escala, escala);
      destino.translate(-minX, -minY);
      for (const stroke of lista) drawStroke(destino, stroke, 0, sprites, colors);
      destino.restore();
    };
    pintar(
      ctx,
      strokes.filter((stroke) => !stroke.oculta)
    );
    // Lo oculto, en una capa aparte que se pega apagada: cada sello del spray
    // pone su propia opacidad, así que bajarla al pintar no serviría.
    const ocultos = strokes.filter((stroke) => stroke.oculta);
    const capa = ocultos.length ? document.createElement('canvas') : null;
    const capaCtx = capa?.getContext('2d');
    if (capaCtx) {
      capa.width = canvas.width;
      capa.height = canvas.height;
      pintar(capaCtx, ocultos);
      ctx.globalAlpha = 0.25;
      ctx.drawImage(capa, 0, 0);
      ctx.globalAlpha = 1;
    }
  }, [strokes]);
  return (
    <canvas
      ref={canvasRef}
      className="taller-pared-vista"
      width="640"
      height="360"
      role="img"
      aria-label={`Vista previa de la pared: ${plural(strokes.length, 'trazo', 'trazos')}`}
    />
  );
}

export default function ParedTaller({ onFallo }) {
  const [datos, setDatos] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [aviso, setAviso] = useState({ tipo: 'reposo', texto: '' });

  const fallar = useCallback(
    (error) => {
      setAviso({ tipo: 'fallo', texto: error.message });
      onFallo?.(error);
    },
    [onFallo]
  );

  const cargar = useCallback(async () => {
    try {
      setDatos(await api.listarParedes());
    } catch (error) {
      fallar(error);
    }
  }, [fallar]);

  const abrir = useCallback(
    async (pared) => {
      setAbierta(pared);
      try {
        setDetalle(await api.detallePared(separar(pared)));
      } catch (error) {
        setDetalle(null);
        fallar(error);
      }
    },
    [fallar]
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  const accion = async (fn, texto) => {
    try {
      await fn();
      setAviso({ tipo: 'ok', texto });
      await cargar();
      if (abierta) await abrir(abierta);
    } catch (error) {
      fallar(error);
    }
  };

  // Limpiar borra la pared en el servidor: no se vuelve a abrir (daría «no
  // existe» y taparía el aviso), solo se recarga la lista.
  const limpiar = async () => {
    try {
      await api.limpiarPared(sitio);
      setAbierta(null);
      setDetalle(null);
      setAviso({ tipo: 'ok', texto: 'Pared limpia.' });
      await cargar();
    } catch (error) {
      fallar(error);
    }
  };

  const interruptor = async (encendida) => {
    try {
      const { estado } = await api.interruptorPared(encendida);
      setDatos((actual) => ({ ...actual, estado }));
      setAviso({ tipo: 'ok', texto: encendida ? 'Pared encendida.' : 'Pared apagada.' });
    } catch (error) {
      fallar(error);
    }
  };

  const estado = datos?.estado;
  const sitio = abierta ? separar(abierta) : null;

  return (
    <section className="taller-pared" aria-label="La pared compartida">
      <h2 className="taller-subtitulo">La pared</h2>
      {estado && (
        <div className="taller-pared-estado">
          <p className="taller-ayuda">{textoEstado(estado)}</p>
          {estado.configurada && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => interruptor(!(estado.encendida && !estado.corrupta))}
            >
              {estado.encendida && !estado.corrupta ? 'Apagar la pared' : 'Encender la pared'}
            </button>
          )}
        </div>
      )}
      {aviso.texto && (
        <p
          className={aviso.tipo === 'fallo' ? 'taller-fallo' : 'taller-ok'}
          role={aviso.tipo === 'fallo' ? 'alert' : 'status'}
        >
          {aviso.texto}
        </p>
      )}

      {datos?.paredes?.length === 0 && <p className="taller-ayuda">Nadie ha pintado todavía.</p>}
      <ul className="taller-paredes">
        {datos?.paredes?.map((pared) => {
          const { pagina, ancho } = separar(pared.pared);
          return (
            <li key={pared.pared}>
              <button
                type="button"
                className={`paper-card taller-pared-fila${pared.pared === abierta ? ' is-active' : ''}`}
                aria-pressed={pared.pared === abierta}
                onClick={() => abrir(pared.pared)}
              >
                <span className="taller-drop-titulo">
                  {pagina} · {ancho}
                </span>
                <span className="taller-drop-meta">
                  {plural(pared.trazos, 'trazo', 'trazos')} ·{' '}
                  {plural(pared.firmas, 'firma', 'firmas')} ·{' '}
                  {plural(pared.reportes, 'reporte', 'reportes')}
                  {pared.ocultas ? ` · ${plural(pared.ocultas, 'oculta', 'ocultas')}` : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {detalle && sitio && (
        <div className="paper-card taller-pared-detalle">
          <VistaPrevia strokes={detalle.strokes} />
          <ul className="taller-firmas" aria-label="Firmas de la pared">
            {detalle.firmas.map((f) => (
              <li key={f.firma} aria-label={f.firma} className={f.oculta ? 'is-oculta' : ''}>
                <span className="taller-drop-titulo">{f.firma}</span>
                <span className="taller-drop-meta">
                  {plural(f.trazos, 'trazo', 'trazos')} ·{' '}
                  {plural(f.reportes, 'reporte', 'reportes')}
                  {f.oculta ? ' · oculta' : ''}
                </span>
                <span className="taller-acciones">
                  {f.oculta ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        accion(
                          () => api.mostrarFirma({ ...sitio, firma: f.firma }),
                          'Visible otra vez.'
                        )
                      }
                    >
                      Mostrar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        accion(() => api.ocultarFirma({ ...sitio, firma: f.firma }), 'Oculta.')
                      }
                    >
                      Ocultar
                    </button>
                  )}
                  <BotonConfirmar
                    etiqueta="Borrar lo suyo"
                    onConfirmar={() =>
                      accion(() => api.borrarFirma({ ...sitio, firma: f.firma }), 'Borrado.')
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
          <BotonConfirmar etiqueta="Limpiar la pared" onConfirmar={limpiar} />
        </div>
      )}
    </section>
  );
}
