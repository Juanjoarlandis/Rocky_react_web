import { PUBLICO, TRACK_IDS } from '../../../data/mesa';
import { estadosDelPublico } from '../audio/drumKit';
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
// la radio). Quien tiene pasos pero está callado se duerme (con sus zetas) y
// quien suena con su solo puesto tiene el foco (reacciones-del-publico): las
// zetas y el foco son del hueco de cada uno, no de la imagen. Decorativo:
// fuera del lector y del foco. Solo en ordenador.

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
  const { miembros } = estadosDelPublico(pattern, { mutes, solos, playing });
  const alguien = miembros.some((miembro) => miembro.estado === 'baila');

  return (
    <div
      className="publico"
      aria-hidden="true"
      data-groove={alguien ? '' : undefined}
      style={{ '--bpm': String(bpm) }}
    >
      {TRACK_IDS.map((pista, index) => {
        const personaje = PUBLICO[pista];
        const { estado, solo } = miembros[index];
        const baila = estado === 'baila';
        const sitio = ['publico-sitio', estado === 'duerme' && 'is-dormido', solo && 'is-solo']
          .filter(Boolean)
          .join(' ');
        return (
          <span key={pista} className={sitio}>
            <img
              src={arte(ARTE[personaje])}
              alt=""
              loading="lazy"
              decoding="async"
              className={`publico-miembro neon-art${baila ? ' is-bailando al-ritmo' : ''}`}
              style={{ '--fase': fase(index) }}
              data-pista={pista}
              data-personaje={personaje}
            />
          </span>
        );
      })}
    </div>
  );
}
