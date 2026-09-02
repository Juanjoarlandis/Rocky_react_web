import React, { useEffect } from 'react';
import logo from '../images/Rockypng.png';
import skaterOllie from '../images/optimized/splash/skater-ollie.webp';
import grafiteroSpray from '../images/optimized/splash/grafitero-spray.webp';
import breakdanceFreeze from '../images/optimized/splash/breakdance-freeze.webp';
import perroRocky from '../images/optimized/splash/perro-rocky.webp';
import corriendoBolsa from '../images/optimized/splash/corriendo-bolsa.webp';
import dianaJefe from '../images/optimized/splash/diana-jefe.webp';
import lataSpray from '../images/optimized/splash/lata-spray.webp';
import nubePaseando from '../images/optimized/splash/nube-paseando.webp';
import bombillaEureka from '../images/optimized/splash/bombilla-eureka.webp';
import cruiserPatinando from '../images/optimized/splash/cruiser-patinando.webp';
import abrazandoPaquete from '../images/optimized/splash/abrazando-paquete.webp';
import estrellaApoyado from '../images/optimized/splash/estrella-apoyado.webp';
import skaterHead from '../images/optimized/splash/skater-head.webp';
import bolsaHead from '../images/optimized/splash/bolsa-head.webp';
import colgadoHead from '../images/optimized/splash/colgado-head.webp';
import dormidoHead from '../images/optimized/splash/dormido-head.webp';
import '../styles/SplashIntro.css';

// La crew entra en anillo alrededor del logo, en orden horario desde las 12.
// size en px de alto sobre un lienzo de referencia 1080x1080 (se escala con --splash-u).
const CREW = [
  { src: skaterOllie, width: 316, height: 380, size: 190, x: 50, y: 9, rot: -7, delay: 0.1 },
  { src: nubePaseando, width: 173, height: 300, size: 150, x: 71, y: 14, rot: 5, delay: 0.19 },
  { src: grafiteroSpray, width: 255, height: 420, size: 210, x: 87, y: 32, rot: 4, delay: 0.28 },
  { src: bombillaEureka, width: 184, height: 330, size: 165, x: 93, y: 57, rot: -5, delay: 0.37 },
  { src: breakdanceFreeze, width: 403, height: 400, size: 200, x: 84, y: 81, rot: -8, delay: 0.46 },
  { src: lataSpray, width: 133, height: 300, size: 150, x: 65, y: 90, rot: 6, delay: 0.55 },
  { src: perroRocky, width: 201, height: 280, size: 140, x: 46, y: 91, rot: -4, delay: 0.64 },
  { src: abrazandoPaquete, width: 350, height: 350, size: 175, x: 27, y: 84, rot: 7, delay: 0.73 },
  { src: cruiserPatinando, width: 291, height: 350, size: 175, x: 12, y: 65, rot: -6, delay: 0.82 },
  { src: estrellaApoyado, width: 162, height: 330, size: 165, x: 8, y: 41, rot: 5, delay: 0.91 },
  { src: corriendoBolsa, width: 344, height: 350, size: 175, x: 18, y: 20, rot: -5, delay: 1.0 },
  { src: dianaJefe, width: 231, height: 400, size: 200, x: 33, y: 11, rot: 6, delay: 1.09 },
];

// Sus caras, pegadas como stickers en las esquinas de la pantalla.
const HEADS = [
  { src: skaterHead, width: 300, height: 300, corner: 'tl', rot: -12, delay: 1.3 },
  { src: colgadoHead, width: 300, height: 300, corner: 'tr', rot: 9, delay: 1.42 },
  { src: dormidoHead, width: 300, height: 300, corner: 'bl', rot: 8, delay: 1.54 },
  { src: bolsaHead, width: 300, height: 300, corner: 'br', rot: -10, delay: 1.66 },
];

export default function SplashIntro() {
  // La tienda ya está montada debajo; sin scroll hasta que se recoja la cortina
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  return (
    <div className="splash-intro" role="status">
      <div className="splash-anillo" aria-hidden="true">
        {CREW.map((m) => (
          <img
            key={m.src}
            src={m.src}
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
