// MOTOR DE AUDIO DE LA MESA — un solo AudioContext para todo el estudio.
//
// Cadena: voces → bus de pista → mezcla → saturación suave → compresor →
// maestro → analizador → altavoces. Con envío a una reverb de placa
// generada a mano (ruido decayendo), porque aquí no entran samples: todo
// se sintetiza en el navegador.

export const TRACK_IDS = ['bombo', 'caja', 'hat', 'diana', 'palmas', 'hatab', 'tom', 'sub'];

// Curva de saturación suave (tanh) para el "pegamento" del bus maestro
function softClipCurve(amount = 0.4) {
  const n = 1024;
  const curve = new Float32Array(n);
  const k = 1 + amount * 8;
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * k) / norm;
  }
  return curve;
}

function createNoiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Impulso de reverb: ruido que se apaga. Corto y oscuro, tipo sala pequeña.
function createImpulse(ctx, seconds = 1.5, decay = 3.2) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  return impulse;
}

export function createEngine() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  const ctx = new Ctx();

  const master = ctx.createGain();
  master.gain.value = 0.85;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.6;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 8;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.18;

  const glue = ctx.createWaveShaper();
  glue.curve = softClipCurve(0.35);
  glue.oversample = '2x';

  const mix = ctx.createGain();
  mix.gain.value = 1;

  mix.connect(glue).connect(compressor).connect(master).connect(analyser);
  analyser.connect(ctx.destination);

  // Reverb de placa: los envíos de cada voz entran aquí
  const reverbIn = ctx.createGain();
  reverbIn.gain.value = 1;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 3400;
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulse(ctx);
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.5;
  reverbIn.connect(damp).connect(convolver).connect(reverbOut).connect(mix);

  // Un bus por pista: volumen y mute independientes
  const buses = {};
  TRACK_IDS.forEach((id) => {
    const gain = ctx.createGain();
    gain.gain.value = 0.85;
    gain.connect(mix);
    buses[id] = gain;
  });

  // Bus aparte para los pads melódicos y los efectos
  const padBus = ctx.createGain();
  padBus.gain.value = 0.85;
  padBus.connect(mix);

  const meterData = new Float32Array(analyser.fftSize);
  const chokes = new Map();

  return {
    ctx,
    noise: createNoiseBuffer(ctx),
    mix,
    master,
    analyser,
    reverbIn,
    reverbOut,
    buses,
    padBus,
    chokes,

    busFor(trackId) {
      return buses[trackId] || padBus;
    },

    setTrackLevel(trackId, value) {
      const bus = buses[trackId];
      if (bus) bus.gain.value = value;
    },

    setMasterLevel(value) {
      master.gain.setTargetAtTime(value, ctx.currentTime, 0.02);
    },

    // Nivel RMS del maestro (0..1) para el vúmetro
    level() {
      analyser.getFloatTimeDomainData(meterData);
      let sum = 0;
      for (let i = 0; i < meterData.length; i += 1) {
        sum += meterData[i] * meterData[i];
      }
      return Math.min(1, Math.sqrt(sum / meterData.length) * 2.2);
    },

    resume() {
      if (ctx.state === 'suspended') ctx.resume();
    },

    close() {
      chokes.clear();
      if (ctx.state !== 'closed') ctx.close().catch(() => {});
    },
  };
}
