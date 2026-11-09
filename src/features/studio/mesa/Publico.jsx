import { PUBLICO, TRACK_IDS } from '../../../data/mesa';
import { pistasQueSuenan } from '../audio/drumKit';
import { useNightArtResolver } from '../../night/nightArt.js';
import perroRocky from '../../../images/optimized/characters/perro-rocky-hd.webp';
import bombillaEureka from '../../../images/optimized/characters/bombilla-eureka-hd.webp';
import skaterOllie from '../../../images/optimized/characters/skater-ollie-hd.webp';
import dianaJefe from '../../../images/optimized/characters/diana-jefe-hd.webp';
import estrellaApoyado from '../../../images/optimized/characters/estrella-apoyado-hd.webp';
import cruiserPatinando from '../../../images/optimized/characters/cruiser-patinando-hd.webp';
import sentadoBordeRojo from '../../../images/optimized/characters/sentado-borde-rojo-hd.webp';
import sentadoBordeBlanco from '../../../images/optimized/characters/sentado-borde-blanco-hd.webp';

// EL PÚBLICO DE LA COLMENA — en la grada de la mesa, un personaje por pista.
// Baila quien suena: con la mesa en marcha, el de cada pista con pasos y sin
// callar cabecea al BPM de la mesa (la animación `al-ritmo` de la web, que se
// enciende con `data-groove` y `--bpm` en esta caja, no en el body, que es de
// la radio). Decorativo: fuera del lector y del foco. Solo en ordenador.

const ARTE = Object.freeze({
  'perro-rocky': perroRocky,
  'bombilla-eureka': bombillaEureka,
  'skater-ollie': skaterOllie,
  'diana-jefe': dianaJefe,
  'estrella-apoyado': estrellaApoyado,
  'cruiser-patinando': cruiserPatinando,
  'sentado-borde-rojo': sentadoBordeRojo,
  'sentado-borde-blanco': sentadoBordeBlanco,
});

// Fases repartidas para que no cabeceen en formación
const fase = (index) => ((index * 0.37) % 1).toFixed(2);

export default function Publico({ pattern, mutes, solos, playing, bpm }) {
  const arte = useNightArtResolver();
  const suenan = playing ? pistasQueSuenan(pattern, { mutes, solos }) : [];
  const alguien = suenan.some(Boolean);

  return (
    <div
      className="publico"
      aria-hidden="true"
      data-groove={alguien ? '' : undefined}
      style={{ '--bpm': String(bpm) }}
    >
      {TRACK_IDS.map((pista, index) => {
        const personaje = PUBLICO[pista];
        const baila = Boolean(suenan[index]);
        return (
          <img
            key={pista}
            src={arte(ARTE[personaje])}
            alt=""
            loading="lazy"
            decoding="async"
            className={`publico-miembro neon-art${baila ? ' is-bailando al-ritmo' : ''}`}
            style={{ '--fase': fase(index) }}
            data-pista={pista}
            data-personaje={personaje}
          />
        );
      })}
    </div>
  );
}
