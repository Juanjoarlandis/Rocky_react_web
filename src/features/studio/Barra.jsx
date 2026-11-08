import { useEffect, useRef, useState } from 'react';
import { requestBarra } from '../../api/chat.js';
import { encodePattern, isEmptyPattern } from '../../utils/beatCodec.js';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard.js';
import '../../styles/components/barra.css';

/* Rocky IA te escribe una barra: cuatro versos sobre el beat de la mesa. Si
   la mesa suena, cada compás enciende el verso que toca, como un karaoke. */
export default function Barra({ pattern, bpm, swing, tonality, playing, step }) {
  const [verses, setVerses] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [line, setLine] = useState(-1);
  const lastStep = useRef(-1);
  const { copy } = useCopyToClipboard();
  const empty = isEmptyPattern(pattern);

  // Cada vuelta al primer paso es un compás nuevo: el verso siguiente.
  useEffect(() => {
    if (!playing || !verses) {
      lastStep.current = -1;
      setLine(-1);
      return;
    }
    if (step === 0 && lastStep.current !== 0) setLine((current) => (current + 1) % verses.length);
    lastStep.current = step;
  }, [playing, step, verses]);

  const ask = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const result = await requestBarra({
        code: encodePattern(pattern),
        bpm,
        swing,
        tono: tonality.id,
      });
      setVerses(result.versos);
      setLine(-1);
      lastStep.current = -1;
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Rocky IA no contesta ahora mismo.');
    }
  };

  const copyVerses = async () => {
    const ok = await copy(
      `${verses.join('\n')}\n— Rocky IA sobre mi beat en La Colmena · ROCKY 035`
    );
    setMessage(ok ? 'Barra copiada.' : 'No se ha podido copiar.');
  };

  if (status === 'idle') {
    return (
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={ask}
        disabled={empty}
        title={empty ? 'Pon algún golpe antes' : undefined}
      >
        Rocky IA, rapéame
      </button>
    );
  }

  return (
    <div className="mesa-barra" aria-live="polite">
      <p className="mesa-barra-titulo">Rocky IA rapea tu beat</p>
      {status === 'loading' && <p className="mesa-barra-nota">Rocky IA está escribiendo…</p>}
      {verses && status !== 'loading' && (
        <ol className="mesa-barra-versos">
          {verses.map((verse, index) => (
            <li key={`${index}-${verse}`} className={index === line ? 'is-now' : undefined}>
              {verse}
            </li>
          ))}
        </ol>
      )}
      {message && (
        <p className={`mesa-barra-nota${status === 'error' ? ' is-error' : ''}`} role="status">
          {message}
        </p>
      )}
      <div className="mesa-barra-botones">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={ask}
          disabled={status === 'loading' || empty}
        >
          {verses ? 'Otra barra' : 'Probar otra vez'}
        </button>
        {verses && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={copyVerses}>
            Copiar
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            setStatus('idle');
            setVerses(null);
            setMessage('');
          }}
        >
          Cerrar
        </button>
      </div>
      {verses && !playing && (
        <p className="mesa-barra-nota">Dale al play: cada compás enciende un verso.</p>
      )}
    </div>
  );
}
