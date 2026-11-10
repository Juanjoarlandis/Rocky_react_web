/* El traqueteo de la bola del bote al cogerlo: tres ráfagas cortas de ruido
   filtrado, bajito. Es un adorno: si el navegador no tiene audio, no deja
   sonar o algo falla, no pasa nada. No usa el motor de la mesa de beats (ocho
   buses y sus analizadores) para no arrastrarlo al modo neón. */

const GOLPES = [0, 0.07, 0.13];
const DURACION = 0.035;
const VOLUMEN = 0.07;

let contexto = null;

// Para las pruebas: cada una empieza sin contexto abierto.
export function olvidarAudio() {
  contexto = null;
}

export function traquetear() {
  try {
    const Contexto = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Contexto) return;
    contexto ??= new Contexto();
    const ctx = contexto;
    // resume() devuelve una promesa: si el navegador no deja, tampoco pasa nada
    if (ctx.state === 'suspended') ctx.resume()?.catch?.(() => {});
    const largo = Math.ceil(ctx.sampleRate * DURACION);
    const ruido = ctx.createBuffer(1, largo, ctx.sampleRate);
    const datos = ruido.getChannelData(0);
    // Ruido que se apaga solo: cada golpe es un clic seco
    for (let i = 0; i < largo; i += 1) datos[i] = (Math.random() * 2 - 1) * (1 - i / largo);
    GOLPES.forEach((cuando, golpe) => {
      const fuente = ctx.createBufferSource();
      fuente.buffer = ruido;
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.frequency.value = 2600 + golpe * 500;
      filtro.Q.value = 6;
      const ganancia = ctx.createGain();
      ganancia.gain.value = VOLUMEN;
      fuente.connect(filtro).connect(ganancia).connect(ctx.destination);
      fuente.start(ctx.currentTime + cuando);
    });
  } catch {
    // Sin audio no hay traqueteo, y ya está.
  }
}
