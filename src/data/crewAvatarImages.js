import bolsaHead from '../images/optimized/splash/bolsa-head.webp';
import breakdanceFreeze from '../images/optimized/characters/breakdance-freeze-600.webp';
import colgadoHead from '../images/optimized/splash/colgado-head.webp';
import dianaJefe from '../images/optimized/characters/diana-jefe-600.webp';
import dormidoHead from '../images/optimized/splash/dormido-head.webp';
import estrellaApoyado from '../images/optimized/characters/estrella-apoyado-600.webp';
import grafiteroSpray from '../images/optimized/characters/grafitero-spray-600.webp';
import skaterHead from '../images/optimized/splash/skater-head.webp';
import skaterOllie from '../images/optimized/characters/skater-ollie-600.webp';

const CREW_AVATAR_IMAGES = Object.freeze({
  'skater-head': skaterHead,
  'dormido-head': dormidoHead,
  'colgado-head': colgadoHead,
  'bolsa-head': bolsaHead,
  'diana-jefe': dianaJefe,
  'estrella-apoyado': estrellaApoyado,
  'skater-ollie': skaterOllie,
  'grafitero-spray': grafiteroSpray,
  'breakdance-freeze': breakdanceFreeze,
});

export function getCrewAvatarImage(rewardId) {
  return CREW_AVATAR_IMAGES[rewardId] || skaterHead;
}

// Tamaño intrínseco de cada avatar, para reservar sitio en las <img>.
const CREW_AVATAR_SIZES = Object.freeze({
  'skater-head': [300, 300],
  'dormido-head': [300, 300],
  'colgado-head': [300, 300],
  'bolsa-head': [300, 300],
  'diana-jefe': [346, 600],
  'estrella-apoyado': [295, 600],
  'skater-ollie': [499, 600],
  'grafitero-spray': [364, 600],
  'breakdance-freeze': [604, 600],
});

export function getCrewAvatarSize(rewardId) {
  const [width, height] = CREW_AVATAR_SIZES[rewardId] || CREW_AVATAR_SIZES['skater-head'];
  return { width, height };
}
