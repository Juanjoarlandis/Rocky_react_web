import { useCallback, useEffect, useState } from 'react';
import { DROP_STATES } from '../../../shared/drops.mjs';
import * as api from '../../api/taller.js';
import { CrosshairSpinner } from '../../components/doodles/CrosshairSpinner';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import pegador from '../../images/optimized/characters/pegador-carteles-600.webp';
import { fechaLarga, horaDeMadrid } from '../drops/fecha.js';
import { useNightArt } from '../night/nightArt.js';
import DropEditor from './DropEditor';
import ParedTaller from './ParedTaller';
import '../../styles/pages/taller.css';

// EL TALLER (taller-de-drops): el panel de la crew para programar, configurar,
// editar y publicar drops. Entrada con clave y código de la app; dentro, la
// lista de drops, el alta de uno nuevo y el editor de cada uno.

export const ESTADO_TALLER = Object.freeze({
  [DROP_STATES.DRAFT]: 'Borrador',
  [DROP_STATES.ANNOUNCED]: 'Anunciado',
  [DROP_STATES.LIVE]: 'En la calle',
  [DROP_STATES.LAST_HOURS]: 'Últimas horas',
  [DROP_STATES.ARCHIVE]: 'Archivo',
});

const plural = (n, una, varias) => `${n} ${n === 1 ? una : varias}`;

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

function TallerEntrada({ onEntrar }) {
  const [fallo, setFallo] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(event) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    setEnviando(true);
    setFallo('');
    try {
      await api.login({
        password: String(datos.get('password') || ''),
        code: String(datos.get('code') || '').replace(/\s/g, ''),
      });
      onEntrar();
    } catch (error) {
      setFallo(error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="paper-card taller-entrada" onSubmit={entrar} aria-label="Entrar al Taller">
      <h1 className="page-title">El Taller</h1>
      <p className="subtitle">Solo para la crew.</p>
      <label className="taller-campo">
        <span>Clave</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <label className="taller-campo">
        <span>Código de la app</span>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
        />
      </label>
      {fallo && (
        <p className="taller-fallo" role="alert">
          {fallo}
        </p>
      )}
      <button type="submit" className="btn btn--primary" disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}

function NuevoDrop({ onCreado, onFallo }) {
  const [fallo, setFallo] = useState('');

  async function crear(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const datos = new FormData(form);
    setFallo('');
    try {
      await api.createDrop({
        title: String(datos.get('title') || '').trim(),
        number: Number(datos.get('number')),
        slug: String(datos.get('slug') || '').trim(),
      });
      form.reset();
      onCreado();
    } catch (error) {
      setFallo(error.message);
      onFallo?.(error);
    }
  }

  return (
    <form className="paper-card taller-nuevo" onSubmit={crear} aria-label="Nuevo drop">
      <h2 className="taller-subtitulo">Nuevo drop</h2>
      <div className="taller-fila">
        <label className="taller-campo">
          <span>Título</span>
          <input name="title" maxLength={80} required placeholder="ROCKY DROP 7" />
        </label>
        <label className="taller-campo taller-campo--corto">
          <span>Número</span>
          <input name="number" type="number" min={1} max={999} required />
        </label>
        <label className="taller-campo taller-campo--corto">
          <span>Slug</span>
          <input name="slug" maxLength={40} required placeholder="7" />
        </label>
      </div>
      <p className="taller-ayuda">
        La colección será rocky-drop-&lt;slug&gt; y empieza en borrador.
      </p>
      {fallo && (
        <p className="taller-fallo" role="alert">
          {fallo}
        </p>
      )}
      <button type="submit" className="btn btn--primary btn--sm">
        Crear drop
      </button>
    </form>
  );
}

function TallerPanel({ onSalir }) {
  const pegadorArt = useNightArt(pegador);
  const [drops, setDrops] = useState(null);
  const [fallo, setFallo] = useState('');
  const [abierto, setAbierto] = useState(null);
  const [vista, setVista] = useState('drops');

  // Si el permiso caduca (8 h o servidor reiniciado), de vuelta a la entrada.
  const vigilar = useCallback(
    (error) => {
      if (error?.status === 401) onSalir();
    },
    [onSalir]
  );

  const cargar = useCallback(async () => {
    try {
      const { drops: lista } = await api.listDrops();
      setDrops(lista);
      setFallo('');
    } catch (error) {
      setFallo(error.message);
      vigilar(error);
    }
  }, [vigilar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function salir() {
    await api.logout().catch(() => {});
    onSalir();
  }

  const drop = drops?.find((candidate) => candidate.handle === abierto) ?? null;

  return (
    <div className="taller-panel">
      <header className="taller-cabecera doodle-shelf">
        <div>
          <h1 className="page-title">El Taller</h1>
          <p className="subtitle">Programa, prepara y pega los drops en el muro.</p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={salir}>
          Salir
        </button>
        <img
          src={pegadorArt}
          width="583"
          height="600"
          alt=""
          className="doodle taller-pegador neon-art"
        />
      </header>

      {fallo && (
        <p className="taller-fallo" role="alert">
          {fallo}
        </p>
      )}

      <div className="taller-vistas" role="group" aria-label="Secciones del Taller">
        {[
          ['drops', 'Drops'],
          ['pared', 'La pared'],
        ].map(([id, nombre]) => (
          <button
            key={id}
            type="button"
            className={`chip${vista === id ? ' is-on' : ''}`}
            aria-pressed={vista === id}
            onClick={() => setVista(id)}
          >
            {nombre}
          </button>
        ))}
      </div>

      {vista === 'pared' && <ParedTaller onFallo={vigilar} />}

      <div className="taller-rejilla" hidden={vista !== 'drops'}>
        <section aria-label="Drops" className="taller-lista">
          <h2 className="taller-subtitulo">Drops</h2>
          {drops === null && !fallo && (
            <p className="taller-ayuda">
              <CrosshairSpinner className="page-loading-spinner" /> Cargando…
            </p>
          )}
          {drops?.length === 0 && <p className="taller-ayuda">Aún no hay drops.</p>}
          <ul className="taller-drops">
            {drops?.map((item) => (
              <li key={item.handle}>
                <button
                  type="button"
                  className={`paper-card taller-drop${item.handle === abierto ? ' is-active' : ''}`}
                  onClick={() => setAbierto(item.handle)}
                  aria-pressed={item.handle === abierto}
                >
                  <span className="taller-drop-titulo">{item.title}</span>
                  <span className="sticker taller-drop-estado">{ESTADO_TALLER[item.state]}</span>
                  <span className="taller-drop-meta">
                    {item.config.launchAt
                      ? `${fechaLarga(item.config.launchAt)} · ${horaDeMadrid(item.config.launchAt)}`
                      : 'Sin fecha'}
                  </span>
                  <span className="taller-drop-meta">
                    {plural(item.designs.length, 'diseño', 'diseños')} ·{' '}
                    {plural(item.notices, 'aviso apuntado', 'avisos apuntados')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <NuevoDrop onCreado={cargar} onFallo={vigilar} />
        </section>

        {drop && (
          <DropEditor
            key={drop.handle}
            drop={drop}
            onCambio={cargar}
            onCerrar={() => setAbierto(null)}
            onFallo={vigilar}
          />
        )}
      </div>
    </div>
  );
}

export default function Taller() {
  useDocumentTitle('El Taller');
  useNoIndex();
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    let activo = true;
    api
      .getSession()
      .then((sesion) => activo && setEstado(sesion.active ? 'dentro' : 'fuera'))
      .catch((error) => {
        if (!activo) return;
        setEstado(error?.code === 'TALLER_DISABLED' || error?.status === 404 ? 'apagado' : 'fuera');
      });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="page-container taller">
      {estado === 'cargando' && (
        <div className="page-loading">
          <CrosshairSpinner className="page-loading-spinner" />
          <span>Abriendo el Taller…</span>
        </div>
      )}
      {estado === 'apagado' && (
        <div className="paper-card taller-entrada">
          <h1 className="page-title">El Taller</h1>
          <p>El Taller no está disponible en este servidor.</p>
        </div>
      )}
      {estado === 'fuera' && <TallerEntrada onEntrar={() => setEstado('dentro')} />}
      {estado === 'dentro' && <TallerPanel onSalir={() => setEstado('fuera')} />}
    </div>
  );
}
