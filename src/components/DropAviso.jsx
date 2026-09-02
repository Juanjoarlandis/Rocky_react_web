import React, { useState } from 'react';
import recadero from '../images/optimized/characters/corriendo-bolsa-600.webp';
import '../styles/components/drop-aviso.css';

/* El mostrador de avisos de un drop que aún no ha caído: dejas tu email y El
   Recadero te lo trae el día que salga. El "apodo" es el campo trampa para
   bots — ningún humano lo ve, y el servidor tira a la basura las altas que lo
   traen relleno. */

const recuerdoDe = (producto) => `rocky-aviso-${producto}`;

export default function DropAviso({ producto }) {
    const [estado, setEstado] = useState(() =>
        globalThis.localStorage?.getItem(recuerdoDe(producto)) ? 'listo' : 'reposo'
    );
    const [repetido, setRepetido] = useState(false);
    const [fallo, setFallo] = useState('');

    if (!producto) return null;

    async function enviar(event) {
        event.preventDefault();
        const datos = new FormData(event.currentTarget);
        setEstado('enviando');
        setFallo('');

        try {
            const respuesta = await fetch('/api/avisos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    producto,
                    email: String(datos.get('email') || ''),
                    consentimiento: datos.get('consentimiento') === 'on',
                    apodo: String(datos.get('apodo') || ''),
                }),
            });
            const cuerpo = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok) {
                setEstado('reposo');
                setFallo(cuerpo.message || 'No hemos podido apuntarte. Prueba otra vez.');
                return;
            }

            globalThis.localStorage?.setItem(recuerdoDe(producto), '1');
            setRepetido(Boolean(cuerpo.repetido));
            setEstado('listo');
        } catch {
            setEstado('reposo');
            setFallo('No hemos podido apuntarte. Prueba otra vez.');
        }
    }

    if (estado === 'listo') {
        return (
            <div className="drop-aviso drop-aviso--listo" data-testid="drop-aviso-listo">
                {/* El Recadero ya tiene tu recado en la bolsa */}
                <img
                    src={recadero}
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
                <input
                    type="checkbox"
                    name="consentimiento"
                    required
                    disabled={estado === 'enviando'}
                />
                <span>
                    Usaremos tu email sólo para avisarte de este drop; después, la
                    lista se borra.
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
