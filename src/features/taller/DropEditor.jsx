import { useState } from 'react';
import { CONFIG_STATUS } from '../../../shared/drops.mjs';
import * as api from '../../api/taller.js';
import Cartel from '../drops/Cartel';
import DisenosEditor from './DisenosEditor';
import BotonConfirmar from './BotonConfirmar';
import { horaMadridAIso, isoAHoraMadrid } from './hora.js';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/* Tres momentos del mismo cartel para la vista previa: tres días antes del
   lanzamiento, una hora después y pasado el cierre (si no hay cierre, se
   supone una semana). Se pintan con el Cartel público, sin tocar la web. */
function vistasPrevias(base) {
  const lanzamiento = Date.parse(base.launchAt ?? '') || Date.now() + 3 * DAY;
  const cierre = Date.parse(base.endsAt ?? '') || lanzamiento + 7 * DAY;
  const drop = {
    ...base,
    launchAt: new Date(lanzamiento).toISOString(),
    endsAt: new Date(cierre).toISOString(),
  };
  return [
    { clave: 'anunciado', drop, ahora: lanzamiento - 3 * DAY },
    { clave: 'en-la-calle', drop, ahora: lanzamiento + HOUR },
    { clave: 'archivo', drop, ahora: cierre + HOUR },
  ];
}

export default function DropEditor({ drop, onCambio, onCerrar }) {
  const { config } = drop;
  const [form, setForm] = useState(() => ({
    title: drop.title,
    number: String(config.number),
    tagline: config.tagline,
    story: config.story,
    launchAt: isoAHoraMadrid(config.launchAt),
    endsAt: isoAHoraMadrid(config.endsAt),
  }));
  const [poster, setPoster] = useState(drop.poster);
  const [posterCambiado, setPosterCambiado] = useState(false);
  const [estado, setEstado] = useState({ tipo: 'reposo', texto: '' });
  const programado = config.status === CONFIG_STATUS.SCHEDULED;
  const editorId = `editor-${drop.handle}`;

  const campo = (nombre) => ({
    value: form[nombre],
    onChange: (event) => setForm((actual) => ({ ...actual, [nombre]: event.target.value })),
  });

  async function accion(fn, okTexto) {
    setEstado({ tipo: 'ocupado', texto: '' });
    try {
      await fn();
      setEstado({ tipo: 'ok', texto: okTexto });
      await onCambio();
    } catch (error) {
      setEstado({ tipo: 'fallo', texto: error.message });
    }
  }

  async function subirCartel(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const alt = `Cartel del ${form.title}`;
    setEstado({ tipo: 'ocupado', texto: 'Subiendo el cartel…' });
    try {
      const subido = await api.uploadImage(file, alt);
      setPoster({ url: subido.url, alt });
      setPosterCambiado(true);
      setEstado({ tipo: 'ok', texto: 'Cartel subido: guarda para pegarlo.' });
    } catch (error) {
      setEstado({ tipo: 'fallo', texto: error.message });
    }
  }

  function guardar(event) {
    event.preventDefault();
    const cambios = {
      title: form.title.trim(),
      number: Number(form.number),
      tagline: form.tagline,
      story: form.story,
      launchAt: horaMadridAIso(form.launchAt),
      endsAt: horaMadridAIso(form.endsAt),
    };
    if (posterCambiado) cambios.poster = poster;
    return accion(() => api.updateDrop(drop.handle, cambios), 'Guardado.');
  }

  const vista = {
    handle: drop.handle,
    number: Number(form.number) || config.number,
    title: form.title,
    tagline: form.tagline,
    story: form.story,
    poster,
    launchAt: horaMadridAIso(form.launchAt),
    endsAt: horaMadridAIso(form.endsAt),
    designCount: drop.designs.length,
    designs: drop.designs.map((design) => design.handle),
    soldOut: false,
  };
  const disenos = drop.designs.map((design) => ({
    handle: design.handle,
    title: design.title,
    image: design.image?.url,
    imageAlt: design.image?.alt || design.title,
  }));

  return (
    <section className="taller-editor" aria-label={`Editar ${drop.title}`} id={editorId}>
      <div className="taller-editor-cabecera">
        <h2 className="taller-subtitulo">{drop.title}</h2>
        <code className="taller-handle">{drop.handle}</code>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCerrar}>
          Cerrar
        </button>
      </div>

      <form className="paper-card taller-form" onSubmit={guardar} aria-label="Datos del drop">
        <div className="taller-fila">
          <label className="taller-campo">
            <span>Título</span>
            <input maxLength={80} required {...campo('title')} />
          </label>
          <label className="taller-campo taller-campo--corto">
            <span>Número</span>
            <input type="number" min={1} max={999} required {...campo('number')} />
          </label>
        </div>
        <label className="taller-campo">
          <span>Lema</span>
          <input maxLength={80} {...campo('tagline')} />
        </label>
        <label className="taller-campo">
          <span>Historia</span>
          <textarea maxLength={600} rows={3} {...campo('story')} />
        </label>
        <div className="taller-fila">
          <label className="taller-campo">
            <span>Lanzamiento (hora de Madrid)</span>
            <input type="datetime-local" {...campo('launchAt')} />
          </label>
          <label className="taller-campo">
            <span>Cierre (hora de Madrid)</span>
            <input type="datetime-local" {...campo('endsAt')} />
          </label>
        </div>
        <p className="taller-ayuda">
          Sin cierre, el drop sigue en la calle hasta agotarse. Las últimas 48 h antes del cierre el
          cartel se despega.
        </p>
        <label className="taller-campo">
          <span>Cartel</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={subirCartel} />
        </label>

        {estado.texto && (
          <p
            className={estado.tipo === 'fallo' ? 'taller-fallo' : 'taller-ok'}
            role={estado.tipo === 'fallo' ? 'alert' : 'status'}
          >
            {estado.texto}
          </p>
        )}

        <div className="taller-acciones">
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={estado.tipo === 'ocupado'}
          >
            Guardar
          </button>
          {programado ? (
            <BotonConfirmar
              etiqueta="Despublicar"
              onConfirmar={() => accion(() => api.unscheduleDrop(drop.handle), 'Despublicado.')}
            />
          ) : (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => accion(() => api.scheduleDrop(drop.handle), 'Programado.')}
            >
              Programar el drop
            </button>
          )}
        </div>
      </form>

      <section className="taller-vista" aria-label="Vista previa del cartel">
        <h3 className="taller-subtitulo">Vista previa</h3>
        <div className="taller-vista-carteles">
          {vistasPrevias(vista).map(({ clave, drop: previo, ahora }) => (
            <Cartel key={clave} drop={previo} products={disenos} serverNow={() => ahora} />
          ))}
        </div>
      </section>

      <DisenosEditor drop={drop} onCambio={onCambio} />
    </section>
  );
}
