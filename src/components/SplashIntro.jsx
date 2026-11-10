import { useLockBodyScroll } from '../hooks/useLockBodyScroll.js';
import logo from '../images/Rockypng.png';
import skaterOllie from '../images/optimized/splash/skater-ollie.webp';
import skaterOllieHalf from '../images/optimized/splash/skater-ollie-mitad.webp';
import grafiteroSpray from '../images/optimized/splash/grafitero-spray.webp';
import grafiteroSprayHalf from '../images/optimized/splash/grafitero-spray-mitad.webp';
import breakdanceFreeze from '../images/optimized/splash/breakdance-freeze.webp';
import breakdanceFreezeHalf from '../images/optimized/splash/breakdance-freeze-mitad.webp';
import perroRocky from '../images/optimized/splash/perro-rocky.webp';
import perroRockyHalf from '../images/optimized/splash/perro-rocky-mitad.webp';
import corriendoBolsa from '../images/optimized/splash/corriendo-bolsa.webp';
import corriendoBolsaHalf from '../images/optimized/splash/corriendo-bolsa-mitad.webp';
import dianaJefe from '../images/optimized/splash/diana-jefe.webp';
import dianaJefeHalf from '../images/optimized/splash/diana-jefe-mitad.webp';
import lataSpray from '../images/optimized/splash/lata-spray.webp';
import lataSprayHalf from '../images/optimized/splash/lata-spray-mitad.webp';
import nubePaseando from '../images/optimized/splash/nube-paseando.webp';
import nubePaseandoHalf from '../images/optimized/splash/nube-paseando-mitad.webp';
import bombillaEureka from '../images/optimized/splash/bombilla-eureka.webp';
import bombillaEurekaHalf from '../images/optimized/splash/bombilla-eureka-mitad.webp';
import cruiserPatinando from '../images/optimized/splash/cruiser-patinando.webp';
import cruiserPatinandoHalf from '../images/optimized/splash/cruiser-patinando-mitad.webp';
import abrazandoPaquete from '../images/optimized/splash/abrazando-paquete.webp';
import abrazandoPaqueteHalf from '../images/optimized/splash/abrazando-paquete-mitad.webp';
import estrellaApoyado from '../images/optimized/splash/estrella-apoyado.webp';
import estrellaApoyadoHalf from '../images/optimized/splash/estrella-apoyado-mitad.webp';
import skaterHead from '../images/optimized/splash/skater-head.webp';
import skaterHeadHalf from '../images/optimized/splash/skater-head-mitad.webp';
import bolsaHead from '../images/optimized/splash/bolsa-head.webp';
import bolsaHeadHalf from '../images/optimized/splash/bolsa-head-mitad.webp';
import colgadoHead from '../images/optimized/splash/colgado-head.webp';
import colgadoHeadHalf from '../images/optimized/splash/colgado-head-mitad.webp';
import dormidoHead from '../images/optimized/splash/dormido-head.webp';
import dormidoHeadHalf from '../images/optimized/splash/dormido-head-mitad.webp';
import '../styles/components/splash-intro.css';

// La crew entra en anillo alrededor del logo, en orden horario desde las 12.
// size en px de alto sobre un lienzo de referencia 1080x1080 (se escala con --splash-u).
const CREW = [
  {
    src: skaterOllie,
    half: skaterOllieHalf,
    width: 316,
    height: 380,
    size: 190,
    x: 50,
    y: 9,
    rot: -7,
    delay: 0.1,
  },
  {
    src: nubePaseando,
    half: nubePaseandoHalf,
    width: 173,
    height: 300,
    size: 150,
    x: 71,
    y: 14,
    rot: 5,
    delay: 0.19,
  },
  {
    src: grafiteroSpray,
    half: grafiteroSprayHalf,
    width: 255,
    height: 420,
    size: 210,
    x: 87,
    y: 32,
    rot: 4,
    delay: 0.28,
  },
  {
    src: bombillaEureka,
    half: bombillaEurekaHalf,
    width: 184,
    height: 330,
    size: 165,
    x: 93,
    y: 57,
    rot: -5,
    delay: 0.37,
  },
  {
    src: breakdanceFreeze,
    half: breakdanceFreezeHalf,
    width: 403,
    height: 400,
    size: 200,
    x: 84,
    y: 81,
    rot: -8,
    delay: 0.46,
  },
  {
    src: lataSpray,
    half: lataSprayHalf,
    width: 133,
    height: 300,
    size: 150,
    x: 65,
    y: 90,
    rot: 6,
    delay: 0.55,
  },
  {
    src: perroRocky,
    half: perroRockyHalf,
    width: 201,
    height: 280,
    size: 140,
    x: 46,
    y: 91,
    rot: -4,
    delay: 0.64,
  },
  {
    src: abrazandoPaquete,
    half: abrazandoPaqueteHalf,
    width: 350,
    height: 350,
    size: 175,
    x: 27,
    y: 84,
    rot: 7,
    delay: 0.73,
  },
  {
    src: cruiserPatinando,
    half: cruiserPatinandoHalf,
    width: 291,
    height: 350,
    size: 175,
    x: 12,
    y: 65,
    rot: -6,
    delay: 0.82,
  },
  {
    src: estrellaApoyado,
    half: estrellaApoyadoHalf,
    width: 162,
    height: 330,
    size: 165,
    x: 8,
    y: 41,
    rot: 5,
    delay: 0.91,
  },
  {
    src: corriendoBolsa,
    half: corriendoBolsaHalf,
    width: 344,
    height: 350,
    size: 175,
    x: 18,
    y: 20,
    rot: -5,
    delay: 1.0,
  },
  {
    src: dianaJefe,
    half: dianaJefeHalf,
    width: 231,
    height: 400,
    size: 200,
    x: 33,
    y: 11,
    rot: 6,
    delay: 1.09,
  },
];

// Sus caras, pegadas como stickers en las esquinas de la pantalla.
const HEADS = [
  {
    src: skaterHead,
    half: skaterHeadHalf,
    width: 300,
    height: 300,
    corner: 'tl',
    rot: -12,
    delay: 1.3,
  },
  {
    src: colgadoHead,
    half: colgadoHeadHalf,
    width: 300,
    height: 300,
    corner: 'tr',
    rot: 9,
    delay: 1.42,
  },
  {
    src: dormidoHead,
    half: dormidoHeadHalf,
    width: 300,
    height: 300,
    corner: 'bl',
    rot: 8,
    delay: 1.54,
  },
  {
    src: bolsaHead,
    half: bolsaHeadHalf,
    width: 300,
    height: 300,
    corner: 'br',
    rot: -10,
    delay: 1.66,
  },
];

/* En un móvil la intro se pinta a menos de la mitad del tamaño del fichero:
   cada imagen lleva su variante a la mitad (`-mitad`), que es la que baja un
   teléfono con densidad de hasta 2 (con 3, el navegador sigue pidiendo la
   entera). El lado corto de la pantalla manda (splash-intro.css): hasta
   486 px los muñecos van al 45 %, y hasta 554 px las caras miden 72 px. */
const sources = (image) =>
  `${image.half} ${Math.round(image.width / 2)}w, ${image.src} ${image.width}w`;
const crewSizes = (image) =>
  `(max-width: 486px) ${Number((image.width * 0.225).toFixed(1))}px, ${image.width / 2}px`;
const HEAD_SIZES = '(max-width: 554px) 72px, 150px';

export default function SplashIntro() {
  // La tienda ya está montada debajo; sin scroll hasta que se recoja la cortina.
  // Mismo bloqueo que el menú y el lightbox, para que se puedan solapar.
  useLockBodyScroll(true);

  return (
    <div className="splash-intro" role="status">
      <div className="splash-anillo" aria-hidden="true">
        {CREW.map((m) => (
          <img
            key={m.src}
            src={m.src}
            srcSet={sources(m)}
            sizes={crewSizes(m)}
            width={m.width}
            height={m.height}
            alt=""
            className="splash-muneco neon-art"
            style={{
              '--size': m.size,
              '--x': `${m.x}%`,
              '--y': `${m.y}%`,
              '--rot': `${m.rot}deg`,
              '--delay': `${m.delay}s`,
            }}
          />
        ))}
      </div>

      {HEADS.map((h) => (
        <img
          key={h.src}
          src={h.src}
          srcSet={sources(h)}
          sizes={HEAD_SIZES}
          width={h.width}
          height={h.height}
          alt=""
          aria-hidden="true"
          className={`splash-head neon-art splash-head--${h.corner}`}
          style={{ '--rot': `${h.rot}deg`, '--delay': `${h.delay}s` }}
        />
      ))}

      <div className="splash-centro">
        <img
          src={logo}
          width="831"
          height="173"
          alt="Cargando ROCKY 035..."
          className="splash-logo neon-art--icon"
        />
        <svg className="splash-squiggle" viewBox="0 0 240 18" aria-hidden="true">
          <path d="M4 11 Q 19 3 34 11 T 64 11 T 94 11 T 124 11 T 154 11 T 184 11 T 214 11 L 236 9" />
        </svg>
        <p className="splash-lema">desde la colmena</p>
      </div>
    </div>
  );
}
