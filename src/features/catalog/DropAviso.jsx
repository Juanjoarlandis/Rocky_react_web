import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { legalPath } from '../../config/legal.js';
// Se pinta a 78 px de ancho: las variantes pequeñas de día y de noche,
// importadas a mano para que la portada no arrastre la tabla de variantes.
import recadero from '../../images/optimized/characters/corriendo-bolsa-h320.webp';
import recaderoNoche from '../../images/optimized/night/no-entrega-h320.webp';
import '../../styles/components/drop-aviso.css';
import { dropNoticeKey } from '../../config/storageKeys.js';
import { readStorage, writeStorage } from '../../utils/storage.js';
import { isAbortError } from '../../api/http.js';
import { useNightMode } from '../night/useNightMode.js';
import { subscribeDropNotice } from '../../api/avisos.js';

/* El mostrador de avisos de un drop que aún no ha caído: dejas tu email y El
   Recadero te lo trae el día que salga. El "apodo" es el campo trampa para
   bots — ningún humano lo ve, y el servidor tira a la basura las altas que lo
   traen relleno. `onApuntado` avisa a quien lo monta de que el recado ya está
   en la lista. */

export default function DropAviso({ producto, onApuntado }) {
  const [estado, setEstado] = useState(() =>
    readStorage(dropNoticeKey(producto)) ? 'listo' : 'reposo'
  );
  const [repetido, setRepetido] = useState(false);
  const recaderoArt = useNightMode() ? recaderoNoche : recadero;
  const [fallo, setFallo] = useState('');
  // La petición en vuelo se cancela si el formulario desaparece
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  // Quien lo monta (las pestañas del cartel) sella su resguardo cuando el
  // recado queda apuntado, también si ya lo estaba de antes.
  useEffect(() => {
    if (estado === 'listo') onApuntado?.();
  }, [estado, onApuntado]);

  if (!producto) return null;

  async function enviar(event) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    setEstado('enviando');
    setFallo('');

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const resultado = await subscribeDropNotice(
        {
          producto,
          email: String(datos.get('email') || ''),
          consentimiento: datos.get('consentimiento') === 'on',
          apodo: String(datos.get('apodo') || ''),
        },
        { signal: controller.signal }
      );
      writeStorage(dropNoticeKey(producto), '1');
      setRepetido(resultado.duplicate);
      setEstado('listo');
    } catch (error) {
      if (isAbortError(error)) return;
      setEstado('reposo');
      setFallo(error.message);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  if (estado === 'listo') {
    return (
      <div className="drop-aviso drop-aviso--listo" data-testid="drop-aviso-listo">
        {/* El Recadero ya tiene tu recado en la bolsa */}
        <img
          src={recaderoArt}
          width="589"
          height="600"
          loading="lazy"
          decoding="async"
          alt=""
          className="doodle drop-aviso-recadero neon-art"
        />
        <p className="drop-aviso-sello">Recado apuntado</p>
        <p className="drop-aviso-nota">
          {repetido
            ? 'Ya estabas en la lista: sin dobles.'
            : 'El Recadero te lo trae el día del drop.'}
        </p>
      </div>
    );
  }

  return (
    <form className="drop-aviso" onSubmit={enviar} data-testid="drop-aviso">
      <p className="drop-aviso-titulo">¿Te avisamos cuando caiga?</p>
      <div className="drop-aviso-fila">
        <input
          type="email"
          name="email"
          required
          maxLength={254}
          placeholder="tu@email.com"
          aria-label="Tu email para el aviso del drop"
          autoComplete="email"
          inputMode="email"
          disabled={estado === 'enviando'}
          className="drop-aviso-email"
        />
        <button
          type="submit"
          className="btn btn--primary drop-aviso-boton"
          disabled={estado === 'enviando'}
        >
          {estado === 'enviando' ? 'Apuntando…' : 'Avísame'}
        </button>
      </div>
      {/* Campo trampa para bots: fuera de la vista y del tabulador */}
      <input
        type="text"
        name="apodo"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="drop-aviso-apodo"
      />
      <label className="drop-aviso-permiso">
        <input type="checkbox" name="consentimiento" required disabled={estado === 'enviando'} />
        <span>
          Usaremos tu email sólo para avisarte de este drop; después, la lista se borra.{' '}
          <Link to={legalPath('privacidad')}>Más en privacidad</Link>.
        </span>
      </label>
      {fallo && (
        <p className="drop-aviso-fallo" role="alert">
          {fallo}
        </p>
      )}
    </form>
  );
}
