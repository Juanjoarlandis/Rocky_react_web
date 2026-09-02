import '../../styles/components/boombox.css';
import { useMusic, useMusicTime } from './MusicContext';
import { IconNext, IconPause, IconPlay, IconPrev } from '../../components/icons/PlayerIcons';
import { formatTime } from '../../utils/time.js';

// Compatibilidad: los iconos viven en components/icons/PlayerIcons.
export { IconNext, IconPause, IconPlay, IconPrev };

// Radiocasete dibujado a mano: la mesa de control de la radio global.
// Play/pausa, anterior/siguiente, barra de progreso con seek y ruedas
// del casete girando mientras suena.

export { formatTime };

// El dibujo del aparato: asa y antena bien ancladas al cuerpo, panel de
// mandos, casete con sus ruedas girando y una sombra de tinta dura, como la
// papelería del resto de la web. Cuando suena, la antena emite y el piloto
// REC se enciende.
function BoomboxArt({ playing }) {
  return (
    <svg
      viewBox="0 0 640 340"
      xmlns="http://www.w3.org/2000/svg"
      className={`bb-art ${playing ? 'is-playing' : ''}`}
      role="img"
      aria-label="Radiocasete de ROCKY SOUND"
    >
      {/* Sombra de tinta, como el resto de cartas de la web */}
      <path d="M40 94 L622 92 L630 306 L46 318 Z" fill="rgba(26, 26, 26, 0.16)" />
      {/* Asa: las patas aterrizan en el cuerpo, con sus tacos de anclaje */}
      <path
        d="M212 86 L212 44 Q212 26 232 25 L406 25 Q426 26 426 44 L426 86"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <rect
        x="202"
        y="78"
        width="20"
        height="14"
        rx="4"
        fill="var(--card)"
        stroke="var(--ink)"
        strokeWidth="4"
      />
      <rect
        x="416"
        y="78"
        width="20"
        height="14"
        rx="4"
        fill="var(--card)"
        stroke="var(--ink)"
        strokeWidth="4"
      />
      {/* Antena telescópica: bisagra apoyada en el hombro del aparato */}
      <path d="M556 84 L596 42" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" />
      <path d="M596 42 L622 16" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="625" cy="13" r="6" fill="var(--accent)" stroke="var(--ink)" strokeWidth="3.5" />
      {/* La señal: sólo cuando suena, la radio emite */}
      <g className="bb-senal">
        <path
          d="M632 28 Q640 20 634 8"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M610 22 Q606 14 612 6"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>
      <circle cx="556" cy="86" r="8" fill="var(--ink)" />
      {/* Cuerpo */}
      <path
        d="M34 88 Q26 90 26 100 L28 292 Q28 304 40 306 L600 304 Q612 304 612 292 L610 98 Q610 86 598 86 L46 86 Q38 86 34 88 Z"
        fill="var(--card)"
        stroke="var(--ink)"
        strokeWidth="6.5"
        strokeLinejoin="round"
      />
      {/* Panel de mandos: dos ruedas (volumen y dial) a la izquierda… */}
      <g className="bb-mando">
        <circle cx="80" cy="122" r="14" fill="var(--card)" stroke="var(--ink)" strokeWidth="4.5" />
        <path d="M80 122 L80 111" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <g className="bb-mando">
        <circle cx="124" cy="122" r="14" fill="var(--card)" stroke="var(--ink)" strokeWidth="4.5" />
        <path
          d="M124 122 L133 115"
          stroke="var(--accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>
      {/* …la rejilla de ventilación en medio… */}
      <path
        d="M262 116 L262 130 M282 116 L282 130 M302 116 L302 130 M322 116 L322 130 M342 116 L342 130 M362 116 L362 130 M382 116 L382 130"
        stroke="var(--ink)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* …y el interruptor con su piloto REC a la derecha */}
      <rect
        x="496"
        y="114"
        width="26"
        height="14"
        rx="7"
        fill="var(--card)"
        stroke="var(--ink)"
        strokeWidth="3.5"
      />
      <circle cx="516" cy="121" r="4" fill="var(--ink)" />
      <circle
        className="bb-luz"
        cx="552"
        cy="121"
        r="7"
        fill="var(--card)"
        stroke="var(--ink)"
        strokeWidth="3.5"
      />
      {/* Altavoz izquierdo: la diana de la casa (el sombreado no gira) */}
      <g className="bb-diana">
        <circle cx="128" cy="212" r="62" fill="var(--card)" stroke="var(--ink)" strokeWidth="6" />
        <circle cx="128" cy="212" r="41" fill="none" stroke="var(--ink)" strokeWidth="4.5" />
        <circle cx="128" cy="212" r="20" fill="none" stroke="var(--accent)" strokeWidth="4.5" />
        <path
          d="M128 150 L128 174 M128 250 L128 274 M66 212 L90 212 M166 212 L190 212"
          stroke="var(--accent)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="128" cy="212" r="5" fill="var(--ink)" />
      </g>
      <path
        d="M158 258 L166 250 M166 262 L174 254"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Altavoz derecho */}
      <g className="bb-diana">
        <circle cx="512" cy="212" r="62" fill="var(--card)" stroke="var(--ink)" strokeWidth="6" />
        <circle cx="512" cy="212" r="41" fill="none" stroke="var(--ink)" strokeWidth="4.5" />
        <circle cx="512" cy="212" r="20" fill="none" stroke="var(--accent)" strokeWidth="4.5" />
        <path
          d="M512 150 L512 174 M512 250 L512 274 M450 212 L474 212 M550 212 L574 212"
          stroke="var(--accent)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="512" cy="212" r="5" fill="var(--ink)" />
      </g>
      <path
        d="M542 258 L550 250 M550 262 L558 254"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Placa de la marca, encima de la boca del casete */}
      <rect x="246" y="142" width="148" height="27" rx="7" fill="var(--ink)" />
      <text
        x="320"
        y="162"
        textAnchor="middle"
        fontFamily="'Luckiest Guy', cursive"
        fontSize="17"
        fill="var(--card)"
      >
        ROCKY SOUND
      </text>
      {/* Boca del casete en el aparato */}
      <rect
        x="224"
        y="178"
        width="192"
        height="96"
        rx="10"
        fill="var(--paper)"
        stroke="var(--ink)"
        strokeWidth="5.5"
      />
      {/* La cinta metida dentro: concha con sus cuatro tornillos */}
      <rect
        x="238"
        y="188"
        width="164"
        height="72"
        rx="7"
        fill="var(--card)"
        stroke="var(--ink)"
        strokeWidth="4"
      />
      <path
        d="M244 194 L250 200 M250 194 L244 200 M390 194 L396 200 M396 194 L390 200 M244 248 L250 254 M250 248 L244 254 M390 248 L396 254 M396 248 L390 254"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Etiqueta: franja roja de cabecera, línea escrita y su cara A */}
      <rect
        x="252"
        y="194"
        width="136"
        height="24"
        rx="4"
        fill="var(--card)"
        stroke="var(--ink)"
        strokeWidth="2.5"
      />
      <rect x="253.5" y="195.5" width="133" height="7" rx="2" fill="var(--accent)" />
      <path d="M262 211 L352 211" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      <text x="370" y="215" fontFamily="'Luckiest Guy', cursive" fontSize="11" fill="var(--accent)">
        A
      </text>
      {/* Ventana del carrete: dentro se ve la cinta, más gorda a la
                izquierda porque el tema aún no ha pasado entero */}
      <rect
        x="272"
        y="220"
        width="96"
        height="28"
        rx="14"
        fill="var(--paper)"
        stroke="var(--ink)"
        strokeWidth="3.5"
      />
      <circle cx="290" cy="234" r="11.5" fill="var(--ink-soft)" />
      <circle cx="350" cy="234" r="8.75" fill="var(--ink-soft)" />
      <path d="M301.5 234 L341 234" stroke="var(--ink-soft)" strokeWidth="2.5" />
      {/* Bujes dentados girando sobre la cinta */}
      <g className="bb-spool">
        <circle cx="290" cy="234" r="6" fill="var(--card)" stroke="var(--ink)" strokeWidth="2.5" />
        <path
          d="M290 228.5 L290 231 M294.8 231.25 L292.6 232.5 M294.8 236.75 L292.6 235.5 M290 239.5 L290 237 M285.2 236.75 L287.4 235.5 M285.2 231.25 L287.4 232.5"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <g className="bb-spool">
        <circle cx="350" cy="234" r="6" fill="var(--card)" stroke="var(--ink)" strokeWidth="2.5" />
        <path
          d="M350 228.5 L350 231 M354.8 231.25 L352.6 232.5 M354.8 236.75 L352.6 235.5 M350 239.5 L350 237 M345.2 236.75 L347.4 235.5 M345.2 231.25 L347.4 232.5"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      {/* El trapecio de la platina, con sus dos ejes a los lados */}
      <path
        d="M303 260 L308 251 L332 251 L337 260"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="296" cy="255.5" r="2.5" fill="var(--ink)" />
      <circle cx="344" cy="255.5" r="2.5" fill="var(--ink)" />
      {/* Pies de goma */}
      <rect x="66" y="306" width="36" height="13" rx="6" fill="var(--ink)" />
      <rect x="534" y="304" width="36" height="13" rx="6" fill="var(--ink)" />
    </svg>
  );
}

function Boombox() {
  const { track, playing, duration, toggle, next, prev, seek } = useMusic();
  const time = useMusicTime();

  const progress = duration ? (time / duration) * 100 : 0;

  return (
    <div className="boombox">
      <BoomboxArt playing={playing} />

      <p className="bb-now" aria-live="polite">
        {playing ? 'Sonando' : 'En pausa'}: <strong>{track.title}</strong>
      </p>

      <input
        type="range"
        className="bb-progress"
        min="0"
        max="100"
        step="0.1"
        value={progress}
        onChange={(event) => seek(Number(event.target.value) / 100)}
        aria-label="Progreso del tema"
      />

      <div className="bb-controls">
        <span className="bb-time">{formatTime(time)}</span>
        <button type="button" className="player-btn" onClick={prev} aria-label="Tema anterior">
          <IconPrev />
        </button>
        <button
          type="button"
          className="player-btn player-btn-main"
          onClick={toggle}
          aria-label={playing ? 'Pausar' : 'Reproducir'}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className="player-btn" onClick={next} aria-label="Tema siguiente">
          <IconNext />
        </button>
        <span className="bb-time">{formatTime(duration)}</span>
      </div>
    </div>
  );
}

export default Boombox;
