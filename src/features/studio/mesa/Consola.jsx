import { TRACKS } from '../../../data/mesa';

// LA CONSOLA — un canal por pista (fader vertical, mute, solo y vúmetro) y el
// maestro. Comparte estado con las filas de la rejilla: es la misma mezcla,
// vista como una mesa de verdad. Solo se ve en ordenador (beat-machine.css).
// Los vúmetros los pinta la mesa en su bucle de animación con la variable
// --nivel de cada `.canal-vu`, sin pasar por React.

const porcentaje = (valor) => `${Math.round(valor * 100)} %`;

export default function Consola({
  levels,
  mutes,
  solos,
  volume,
  audible,
  onMute,
  onSolo,
  onLevel,
  onVolume,
  metersRef,
}) {
  const medidor = (index) => (element) => {
    metersRef.current[index] = element;
  };

  return (
    <section className="consola" aria-label="Consola">
      {TRACKS.map((track, index) => (
        <div className={`canal ${audible(index) ? '' : 'is-callado'}`} key={track.id}>
          <div className="canal-vu" ref={medidor(index)} aria-hidden="true">
            <span className="canal-vu-luz" />
          </div>
          <input
            className="canal-fader"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={levels[index]}
            onChange={(e) => onLevel(index, Number(e.target.value))}
            aria-label={`Volumen de ${track.label}`}
            aria-valuetext={porcentaje(levels[index])}
          />
          <div className="canal-botones">
            <button
              type="button"
              className={`canal-mute ${mutes[index] ? 'is-on' : ''}`}
              onClick={() => onMute(index)}
              aria-pressed={mutes[index]}
              aria-label={`Silenciar ${track.label}`}
            >
              M
            </button>
            <button
              type="button"
              className={`canal-solo ${solos[index] ? 'is-on' : ''}`}
              onClick={() => onSolo(index)}
              aria-pressed={solos[index]}
              aria-label={`Dejar solo ${track.label}`}
            >
              S
            </button>
          </div>
          <span className="canal-nombre" aria-hidden="true">
            {track.corto}
          </span>
        </div>
      ))}

      <div className="canal canal--maestro">
        <div className="canal-vu" ref={medidor(TRACKS.length)} aria-hidden="true">
          <span className="canal-vu-luz" />
        </div>
        <input
          className="canal-fader"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          aria-label="Volumen del maestro"
          aria-valuetext={porcentaje(volume)}
        />
        <span className="canal-nombre" aria-hidden="true">
          MST
        </span>
      </div>
    </section>
  );
}
