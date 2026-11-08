import { useNightMode } from './useNightMode.js';

/* De noche, los diecisiete que cambian de dibujo cambian también de ficha: alias,
   oficio y frase del cromo. Stats, rareza y «visto en» siguen siendo los de
   día: es el mismo personaje, torcido. */
export const NIGHT_CREW = Object.freeze({
  tumbao: {
    nombre: 'El Que No Se Levanta',
    rol: 'Fundador horizontal, para siempre',
    frase: 'Ahora subo… nunca.',
  },
  fundadores: {
    nombre: 'Los del Banco',
    rol: 'El banco que lo vio todo y calla',
    frase: 'Desde el banco te vemos.',
  },
  spray: {
    nombre: 'El Tachón',
    rol: 'Tacha todo lo que ve',
    frase: 'La línea roja ahora es una X.',
  },
  vigia: {
    nombre: 'El Vigía Insomne',
    rol: 'Tres ojos, cero parpadeos',
    frase: 'De este marco no sale nadie.',
  },
  portero: {
    nombre: 'El Portero del Infierno',
    rol: 'Recepción de Rocky IA, planta -1',
    frase: 'Pregunta, que el bot ahora sí muerde.',
  },
  curioso: {
    nombre: 'El Mirón',
    rol: 'Ya no pregunta: mira',
    frase: 'Te estaba esperando.',
  },
  productor: {
    nombre: 'El Productor Poseído',
    rol: 'Beats desde el otro lado',
    frase: 'Este loop no termina.',
  },
  paparazzi: {
    nombre: 'El Flash Negro',
    rol: 'Revela lo que no debías ver',
    frase: 'Sonríe. Ya es tarde.',
  },
  diana: {
    nombre: 'La Diana Rota',
    rol: 'La marca, en pedazos',
    frase: 'Ahora el blanco eres tú.',
  },
  cruiser: {
    nombre: 'La Sin Frenos',
    rol: 'Rueda la ciudad y no para',
    frase: '¿Frenar? No me acuerdo.',
  },
  recadero: {
    nombre: 'El Que No Entrega',
    rol: 'Reparte a domicilio lo que no pediste',
    frase: 'Tu pedido ya es mío.',
  },
  freeze: {
    nombre: 'El Congelao',
    rol: 'Se quedó en el freeze para siempre',
    frase: 'No me muevo. Tú tampoco.',
  },
  estrella: {
    nombre: 'El Estrellao',
    rol: 'Cayó del cielo de cabeza',
    frase: 'Pide un deseo. Lo cumplo al revés.',
  },
  ollie: {
    nombre: 'El Que No Aterriza',
    rol: 'Lleva en el aire desde el último drop',
    frase: 'Todavía no he bajado.',
  },
  bombilla: {
    nombre: 'El Fundido',
    rol: 'La idea que no debiste tener',
    frase: 'Se me ha ocurrido algo peor.',
  },
  rocky: {
    nombre: 'El Sabueso Negro',
    rol: 'Guarda la calle sin salida',
    frase: 'Buen chico. Ya no.',
  },
  lata: {
    nombre: 'El Tóxico',
    rol: 'Pinta la marquesina con lo que no se borra',
    frase: 'Si le oyes sisear, ya es tarde.',
  },
});

export function useNightFicha(miembro) {
  const night = useNightMode();
  const noche = night ? NIGHT_CREW[miembro.id] : null;
  return noche ? { ...miembro, ...noche } : miembro;
}
