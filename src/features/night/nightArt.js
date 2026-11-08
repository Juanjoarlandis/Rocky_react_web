import { useNightMode } from './useNightMode.js';

/* El modo descontrol: de noche, diecisiete de la crew salen en su versión malvada.
   Cada dibujo de día se empareja con el suyo de noche; el resto de la crew
   sigue siendo el de siempre, pasado a tubo de neón por .neon-art.

   Los de noche se dibujaron sobre el mismo lienzo que los de día (misma
   pose, mismos apoyos), así que heredan sus anclajes CSS sin tocarlos. Los
   maestros y sus prompts están en prompts-munecos/noche/. */

// Día
import asomadoBorde from '../../images/optimized/characters/asomado-borde-hd.webp';
import cotillaEsquina from '../../images/optimized/characters/cotilla-esquina-460.webp';
import grafiteroHd from '../../images/optimized/characters/grafitero-spray-hd.webp';
import grafiteroSinChorro from '../../images/optimized/characters/grafitero-sin-chorro-420.webp';
import cruiserHd from '../../images/optimized/characters/cruiser-patinando-hd.webp';
import cruiserSplash from '../../images/optimized/splash/cruiser-patinando.webp';
import fotografoHd from '../../images/optimized/characters/fotografo-agachado-hd.webp';
import fotografoShell from '../../images/optimized/shell/fotografo-agachado.webp';
import dianaHd from '../../images/optimized/characters/diana-jefe-hd.webp';
import dianaSplash from '../../images/optimized/splash/diana-jefe.webp';
import sentados from '../../images/optimized/shell/sentado-860.webp';
import tumbado from '../../images/optimized/shell/tumbado-800.webp';
import sentadoBlanco from '../../images/optimized/characters/sentado-borde-blanco-hd.webp';
import sentadoRojo from '../../images/optimized/characters/sentado-borde-rojo-hd.webp';
import auriculares from '../../images/optimized/characters/auriculares-sentado-hd.webp';
import recaderoHd from '../../images/optimized/characters/corriendo-bolsa-hd.webp';
import recaderoSplash from '../../images/optimized/splash/corriendo-bolsa.webp';
import freezeHd from '../../images/optimized/characters/breakdance-freeze-hd.webp';
import estrellaHd from '../../images/optimized/characters/estrella-apoyado-hd.webp';
import ollieHd from '../../images/optimized/characters/skater-ollie-hd.webp';
import bombillaHd from '../../images/optimized/characters/bombilla-eureka-hd.webp';
import rockyHd from '../../images/optimized/characters/perro-rocky-hd.webp';
import lataHd from '../../images/optimized/characters/lata-spray-hd.webp';
import lataPaseo from '../../images/optimized/characters/lata-spray-walk-seedance-224.webp';
import lataPaseoQuieto from '../../images/optimized/characters/lata-spray-walk-seedance-poster-224.webp';

// Noche
import miron from '../../images/optimized/night/miron-800.webp';
import mironEsquina from '../../images/optimized/night/miron-esquina-460.webp';
import tachon from '../../images/optimized/night/tachon-800.webp';
import tachon420 from '../../images/optimized/night/tachon-420.webp';
import sinFrenos from '../../images/optimized/night/sin-frenos-800.webp';
import sinFrenos350 from '../../images/optimized/night/sin-frenos-350.webp';
import flashNegro from '../../images/optimized/night/flash-negro-800.webp';
import flashNegro316 from '../../images/optimized/night/flash-negro-316.webp';
import dianaRota from '../../images/optimized/night/diana-rota-800.webp';
import dianaRota400 from '../../images/optimized/night/diana-rota-400.webp';
import losDelBanco from '../../images/optimized/night/los-del-banco-860.webp';
import noSeLevanta from '../../images/optimized/night/no-se-levanta-800.webp';
import vigiaInsomne from '../../images/optimized/night/vigia-insomne-800.webp';
import porteroInfierno from '../../images/optimized/night/portero-infierno-800.webp';
import productorPoseido from '../../images/optimized/night/productor-poseido-800.webp';
import noEntrega from '../../images/optimized/night/no-entrega-800.webp';
import noEntrega350 from '../../images/optimized/night/no-entrega-350.webp';
import congelao from '../../images/optimized/night/congelao-800.webp';
import estrellao from '../../images/optimized/night/estrellao-800.webp';
import noAterriza from '../../images/optimized/night/no-aterriza-800.webp';
import fundido from '../../images/optimized/night/fundido-800.webp';
import sabuesoNegro from '../../images/optimized/night/sabueso-negro-800.webp';
import toxico from '../../images/optimized/night/toxico-800.webp';
// El paseo de la marquesina: la cabeza de El Tóxico trasplantada a los 81
// fotogramas del paseo de día (ver prompts-munecos/noche/README.md).
import toxicoPaseo from '../../images/optimized/night/toxico-paseo-224.webp';
import toxicoPaseoQuieto from '../../images/optimized/night/toxico-paseo-poster-224.webp';

const NIGHT_ART = new Map([
  [asomadoBorde, miron],
  [cotillaEsquina, mironEsquina],
  [grafiteroHd, tachon],
  [grafiteroSinChorro, tachon420],
  [cruiserHd, sinFrenos],
  [cruiserSplash, sinFrenos350],
  [fotografoHd, flashNegro],
  [fotografoShell, flashNegro316],
  [dianaHd, dianaRota],
  [dianaSplash, dianaRota400],
  [sentados, losDelBanco],
  [tumbado, noSeLevanta],
  [sentadoBlanco, vigiaInsomne],
  [sentadoRojo, porteroInfierno],
  [auriculares, productorPoseido],
  [recaderoHd, noEntrega],
  [recaderoSplash, noEntrega350],
  [freezeHd, congelao],
  [estrellaHd, estrellao],
  [ollieHd, noAterriza],
  [bombillaHd, fundido],
  [rockyHd, sabuesoNegro],
  [lataHd, toxico],
  [lataPaseo, toxicoPaseo],
  [lataPaseoQuieto, toxicoPaseoQuieto],
]);

export function nightArtFor(src) {
  return NIGHT_ART.get(src) ?? src;
}

/* El src que toca según la hora: de día el de siempre, de noche su versión
   malvada si la tiene. */
export function useNightArt(src) {
  const night = useNightMode();
  return night ? nightArtFor(src) : src;
}

const sameArt = (src) => src;

/* Para listas (la crew): una función estable que se aplica a cada src. */
export function useNightArtResolver() {
  const night = useNightMode();
  return night ? nightArtFor : sameArt;
}
