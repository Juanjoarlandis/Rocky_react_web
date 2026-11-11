/* LAS VOCES DE LA CREW (voz-de-la-crew): quién puede firmar la ficha de una
   camiseta, con qué dibujo y qué grita al añadirla al carrito. Va aparte de
   crew.js para no meter los veinticinco cromos (stats, expedientes) en la
   ficha; voces.test.js comprueba que los nombres y los dibujos casan con el
   álbum. Los gritos son decisión de producto (design.md, D2).

   La cabeza de la firma es un recorte ampliado del dibujo (D3). `foco` dice
   dónde está la cabeza cuando no está arriba en el centro; `oscuro`, que el
   dibujo es de línea blanca (el de Los Fundadores es el del pie) y va sobre
   fondo oscuro. Ajustados mirando los 25 recortes juntos. */

import tumbado from '../images/optimized/shell/tumbado-800.webp';
import fundadores from '../images/optimized/shell/sentado-860.webp';
import grafitero from '../images/optimized/characters/grafitero-spray-hd.webp';
import vigia from '../images/optimized/characters/sentado-borde-blanco-hd.webp';
import portero from '../images/optimized/characters/sentado-borde-rojo-hd.webp';
import curioso from '../images/optimized/characters/asomado-borde-hd.webp';
import productor from '../images/optimized/characters/auriculares-sentado-hd.webp';
import freeze from '../images/optimized/characters/breakdance-freeze-hd.webp';
import colgao from '../images/optimized/characters/colgado-borde-hd.webp';
import paparazzi from '../images/optimized/characters/fotografo-agachado-hd.webp';
import dormilon from '../images/optimized/characters/dormido-esperando-hd.webp';
import recadero from '../images/optimized/characters/corriendo-bolsa-hd.webp';
import ollie from '../images/optimized/characters/skater-ollie-hd.webp';
import turista from '../images/optimized/characters/perdido-mapa-hd.webp';
import paquetes from '../images/optimized/characters/abrazando-paquete-hd.webp';
import rocky from '../images/optimized/characters/perro-rocky-hd.webp';
import estrella from '../images/optimized/characters/estrella-apoyado-hd.webp';
import dado from '../images/optimized/characters/dado-sentado-hd.webp';
import nube from '../images/optimized/characters/nube-paseando-hd.webp';
import tele from '../images/optimized/characters/tele-sentado-borde-hd.webp';
import lata from '../images/optimized/characters/lata-spray-hd.webp';
import luna from '../images/optimized/characters/luna-movil-hd.webp';
import diana from '../images/optimized/characters/diana-jefe-hd.webp';
import bombilla from '../images/optimized/characters/bombilla-eureka-hd.webp';
import cruiser from '../images/optimized/characters/cruiser-patinando-hd.webp';

export const VOCES = Object.freeze({
  'El Tumbao': { img: tumbado, grito: 'MEH', foco: '5% 10%' },
  'Los Fundadores': { img: fundadores, grito: '¡EOOO!', foco: '50% 20%', oscuro: true },
  'El Spray': { img: grafitero, grito: '¡PSSST!' },
  'El Vigía': { img: vigia, grito: '¡ALTO!' },
  'El Portero': { img: portero, grito: '¡PASA!' },
  'El Curioso': { img: curioso, grito: '¿EIN?' },
  'El Productor': { img: productor, grito: '¡BOOM!' },
  'El Freeze': { img: freeze, grito: '¡ZAS!', foco: '18% 22%' },
  'El Colgao': { img: colgao, grito: '¡UF!', foco: '50% 24%' },
  'El Paparazzi': { img: paparazzi, grito: '¡FLASH!', foco: '42% 12%' },
  'El Dormilón': { img: dormilon, grito: 'ZZZ' },
  'El Recadero': { img: recadero, grito: '¡QUE VUELA!', foco: '62% 0%' },
  'El Ollie': { img: ollie, grito: '¡POP!', foco: '52% 2%' },
  'El Turista': { img: turista, grito: '¿Y ESTO?', foco: '50% 20%' },
  'El Paquetes': { img: paquetes, grito: '¡UPA!', foco: '10% 16%' },
  Rocky: { img: rocky, grito: '¡GUAU!', foco: '30% 8%' },
  'El Estrella': { img: estrella, grito: '¡TACHÁN!', foco: '50% 4%' },
  'El Dado': { img: dado, grito: '¡SEIS!' },
  'El Nube': { img: nube, grito: '¡PLIC!' },
  'El Tele': { img: tele, grito: '¡ZZZT!', foco: '50% 14%' },
  'El Lata': { img: lata, grito: '¡CLAC CLAC!', foco: '50% 6%' },
  'El Luna': { img: luna, grito: '¡UUUH!' },
  'El Diana': { img: diana, grito: '¡PUM!' },
  'El Bombilla': { img: bombilla, grito: '¡CLIC!' },
  'La Cruiser': { img: cruiser, grito: '¡FIUUU!', foco: '64% 0%' },
});

export const NOMBRES_DE_LA_CREW = Object.freeze(Object.keys(VOCES));
