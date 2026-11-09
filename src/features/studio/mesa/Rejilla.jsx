import { TRACKS } from '../../../data/mesa';
import { STEP_COUNT } from '../../../utils/beatCodec';

// LA REJILLA — las 8 pistas por 16 pasos. Cada fila lleva su nombre (que hace
// de mute), su solo y su volumen; en ordenador esos dos últimos viven en la
// consola y aquí se ocultan (beat-machine.css). El estado es de la mesa.
export default function Rejilla({
  pattern,
  step,
  mutes,
  solos,
  levels,
  audible,
  onMute,
  onSolo,
  onLevel,
  onCell,
}) {
  return (
    <div className="mesa-seq">
      <div className="seq-scroll">
        <div className="seq-regla" aria-hidden="true">
          <span className="seq-hueco" />
          <div className="seq-numeros">
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <span key={i} className={i % 4 === 0 ? 'fuerte' : ''}>
                {i % 4 === 0 ? i / 4 + 1 : '·'}
              </span>
            ))}
          </div>
        </div>

        <div className="seq-rejilla" role="group" aria-label="Secuenciador de 16 pasos">
          {TRACKS.map((track, index) => (
            <fieldset className={`seq-fila ${audible(index) ? '' : 'apagada'}`} key={track.id}>
              <legend className="sr-only">{track.label}</legend>
              <div className="seq-cabeza">
                <button
                  type="button"
                  className={`pista-nombre ${mutes[index] ? 'muda' : ''}`}
                  onClick={() => onMute(index)}
                  aria-pressed={mutes[index]}
                  title={`${mutes[index] ? 'Activar' : 'Silenciar'} ${track.label}`}
                >
                  {track.label}
                </button>
                <button
                  type="button"
                  className={`pista-solo ${solos[index] ? 'is-on' : ''}`}
                  onClick={() => onSolo(index)}
                  aria-pressed={solos[index]}
                  aria-label={`Solo de ${track.label}`}
                >
                  S
                </button>
                <input
                  className="pista-nivel"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={levels[index]}
                  onChange={(e) => onLevel(index, Number(e.target.value))}
                  aria-label={`Volumen de ${track.label}`}
                />
              </div>

              <div className="seq-celdas">
                {pattern[index].map((vel, stepIndex) => (
                  <button
                    key={stepIndex}
                    type="button"
                    className={[
                      'celda',
                      vel ? `v${vel}` : '',
                      track.acento ? 'acento' : '',
                      stepIndex % 4 === 0 ? 'marca' : '',
                      stepIndex === step ? 'is-current' : '',
                    ].join(' ')}
                    aria-pressed={Boolean(vel)}
                    aria-label={`${track.label}, paso ${stepIndex + 1}`}
                    onClick={() => onCell(index, stepIndex)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onCell(index, stepIndex, 0);
                    }}
                  >
                    <span className="celda-luz" />
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
      <p className="seq-pista">
        Pincha para encender · vuelve a pinchar para acento y fantasma · botón derecho borra
      </p>
    </div>
  );
}
