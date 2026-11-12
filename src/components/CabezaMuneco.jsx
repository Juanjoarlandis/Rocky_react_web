import { artSources } from '../data/art.js';
import { useNightArtResolver } from '../features/night/nightArt.js';
import '../styles/components/cabeza-muneco.css';

/* La cabeza de un muñeco de la crew, recortada en un círculo: el dibujo pequeño
   ampliado hacia su foco (src/data/voces.js), con el de noche si toca. Es
   decorativa. La usan la firma de la ficha (voz-de-la-crew) y el mapa del
   barrio (barrio-en-mapa). `clase` suma la de quien la usa, con su variante
   oscura para Los Fundadores, que son de línea blanca. */
export default function CabezaMuneco({ voz, tamano = 56, clase = '' }) {
  const nightArtFor = useNightArtResolver();
  const clases = ['cabeza-muneco', clase];
  if (voz.oscuro) clases.push('cabeza-muneco--oscura', clase && `${clase}--oscura`);
  return (
    <span
      className={clases.filter(Boolean).join(' ')}
      style={{ '--tamano': `${tamano}px`, ...(voz.foco ? { '--foco': voz.foco } : {}) }}
      aria-hidden="true"
    >
      <img
        {...artSources(nightArtFor(voz.img), Math.round(tamano * 1.8))}
        width={tamano}
        height={tamano}
        loading="lazy"
        decoding="async"
        alt=""
        className="neon-art"
      />
    </span>
  );
}
