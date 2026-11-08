import { useState } from 'react';
import { publishBeat } from '../../../api/beats.js';
import { STORAGE_KEYS } from '../../../config/storageKeys.js';
import { encodePattern, isEmptyPattern } from '../../../utils/beatCodec.js';
import { readStorage, writeStorage } from '../../../utils/storage.js';
import { announcePublished } from '../mesaBus.js';
import '../../../styles/components/ranking.css';

/* Publicar el beat de la mesa en el ranking: nombre, apodo y listo. El apodo
   se recuerda en este navegador. Lo que se publica es sólo el patrón, el
   tempo, el swing y el tono; suena en el navegador de quien lo escuche. */
export default function PublishBeat({ pattern, bpm, swing, tonality }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [alias, setAlias] = useState(() => readStorage(STORAGE_KEYS.beatsAlias) ?? '');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const empty = isEmptyPattern(pattern);

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus('sending');
    setMessage('');
    try {
      const result = await publishBeat({
        code: encodePattern(pattern),
        bpm,
        swing,
        tono: tonality.id,
        name,
        alias,
        web: form.get('web') || undefined,
      });
      writeStorage(STORAGE_KEYS.beatsAlias, alias.trim());
      setStatus('done');
      setMessage(
        result.duplicate
          ? 'Ese beat ya estaba en el ranking: te lo enseñamos.'
          : 'Publicado. Ya suena en «Nuevos».'
      );
      if (result.beat) announcePublished(result.beat);
      setName('');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'No se ha podido publicar.');
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => setOpen(true)}
        disabled={empty}
        title={empty ? 'Pon algún golpe antes de publicar' : undefined}
      >
        Publicar en el ranking
      </button>
    );
  }

  return (
    <form className="mesa-publicar" onSubmit={submit} aria-label="Publicar en el ranking">
      <label className="mesa-publicar-campo">
        <span>Nombre del beat</span>
        <input
          name="nombre"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={32}
          required
          placeholder="Barro a medianoche"
          autoComplete="off"
        />
      </label>
      <label className="mesa-publicar-campo">
        <span>Tu apodo</span>
        <input
          name="apodo"
          value={alias}
          onChange={(event) => setAlias(event.target.value)}
          minLength={2}
          maxLength={20}
          required
          placeholder="crew035"
          autoComplete="nickname"
        />
      </label>
      {/* Campo trampa para bots: fuera de la vista y del tabulador */}
      <input
        type="text"
        name="web"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="mesa-publicar-trampa"
      />
      <div className="mesa-publicar-botones">
        <button
          type="submit"
          className="btn btn--primary btn--sm"
          disabled={status === 'sending' || empty}
        >
          {status === 'sending' ? 'Publicando…' : 'Publicar'}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>
          Cerrar
        </button>
      </div>
      <p className={`mesa-publicar-nota${status === 'error' ? ' is-error' : ''}`} role="status">
        {message || 'Tu beat y tu apodo se verán en el ranking de La Colmena.'}
      </p>
    </form>
  );
}
