// LAS VOCES DE LA MESA — cada sonido se sintetiza en el momento.
// Nada de samples: osciladores, ruido y filtros. Cada voz acepta ganancia
// (velocidad de la celda o del pad) y un envío a la reverb.

export function noteFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function route(engine, node, opts = {}) {
  const out = opts.out || engine.mix;
  node.connect(out);
  if (opts.send > 0) {
    const send = engine.ctx.createGain();
    send.gain.value = opts.send;
    node.connect(send).connect(engine.reverbIn);
  }
}

// Corte de una voz por otra del mismo grupo (el hat cerrado mata al abierto)
function choke(engine, group, time) {
  const previo = engine.chokes.get(group);
  if (previo) {
    try {
      previo.gain.cancelScheduledValues(time);
      previo.gain.setTargetAtTime(0.0001, time, 0.006);
    } catch {
      // el nodo ya se había liberado
    }
    engine.chokes.delete(group);
  }
}

function registerChoke(engine, group, gainNode) {
  if (group) engine.chokes.set(group, gainNode);
}

function noiseSource(engine, time, duration) {
  const src = engine.ctx.createBufferSource();
  src.buffer = engine.noise;
  // Arrancamos en un punto distinto del buffer: dos golpes nunca son idénticos
  const offset = Math.random() * (engine.noise.duration - duration - 0.05);
  src.start(time, Math.max(0, offset), duration);
  return src;
}

function drive(ctx, amount) {
  const shaper = ctx.createWaveShaper();
  const n = 512;
  const curve = new Float32Array(n);
  const k = 1 + amount * 20;
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  shaper.curve = curve;
  shaper.oversample = '2x';
  return shaper;
}

// Envolvente percusiva estándar: ataque instantáneo y caída exponencial
function hit(ctx, gainNode, time, peak, decay, attack = 0.002) {
  gainNode.gain.cancelScheduledValues(time);
  gainNode.gain.setValueAtTime(0.0001, time);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), time + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
}

// ---------- Batería ----------

function bombo(engine, time, o = {}) {
  const { ctx } = engine;
  const pitch = o.pitch ?? 52;
  const decay = o.decay ?? 0.45;
  const nivel = o.gain ?? 1;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitch * 4.2, time);
  osc.frequency.exponentialRampToValueAtTime(pitch * 1.6, time + 0.03);
  osc.frequency.exponentialRampToValueAtTime(pitch, time + 0.12);

  const cuerpo = ctx.createGain();
  hit(ctx, cuerpo, time, nivel, decay, 0.004);

  const saturador = drive(ctx, o.drive ?? 0.3);
  const salida = ctx.createGain();
  salida.gain.value = 0.95;
  osc.connect(cuerpo).connect(saturador).connect(salida);

  // Chasquido del batidor
  if ((o.click ?? 0.7) > 0) {
    const clic = noiseSource(engine, time, 0.03);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const clicGain = ctx.createGain();
    hit(ctx, clicGain, time, nivel * 0.28 * (o.click ?? 0.7), 0.02, 0.001);
    clic.connect(hp).connect(clicGain).connect(salida);
    clic.stop(time + 0.05);
  }

  osc.start(time);
  osc.stop(time + decay + 0.1);
  route(engine, salida, o);
}

function caja(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const decay = o.decay ?? 0.19;
  const salida = ctx.createGain();
  salida.gain.value = 1;

  // Parche: dos tonos afinados
  [o.pitch ?? 185, (o.pitch ?? 185) * 1.48].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.25, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.045);
    const g = ctx.createGain();
    hit(ctx, g, time, nivel * (i ? 0.18 : 0.34), decay * 0.6, 0.001);
    osc.connect(g).connect(salida);
    osc.start(time);
    osc.stop(time + decay);
  });

  // Bordón: ruido con paso de banda
  const ruido = noiseSource(engine, time, decay + 0.05);
  const banda = ctx.createBiquadFilter();
  banda.type = 'bandpass';
  banda.frequency.value = o.tono ?? 1900;
  banda.Q.value = 0.7;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 420;
  const gRuido = ctx.createGain();
  hit(ctx, gRuido, time, nivel * 0.62, decay, 0.001);
  ruido.connect(banda).connect(hp).connect(gRuido).connect(salida);
  ruido.stop(time + decay + 0.06);

  route(engine, salida, { ...o, send: o.send ?? 0.14 });
}

function rim(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const salida = ctx.createGain();
  [1720, 2410].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    hit(ctx, g, time, nivel * (i ? 0.18 : 0.3), 0.035, 0.001);
    osc.connect(g).connect(salida);
    osc.start(time);
    osc.stop(time + 0.06);
  });
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2000;
  bp.Q.value = 3;
  salida.connect(bp);
  route(engine, bp, { ...o, send: o.send ?? 0.12 });
}

// Metal tipo 808: seis cuadradas desafinadas. Sirve de hat, ride y crash.
function metal(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const decay = o.decay ?? 0.06;
  const base = o.base ?? 40;
  const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];

  const banda = ctx.createBiquadFilter();
  banda.type = 'bandpass';
  banda.frequency.value = o.color ?? 10000;
  banda.Q.value = 0.9;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = o.hp ?? 7000;

  const g = ctx.createGain();
  hit(ctx, g, time, nivel * (o.nivelBase ?? 0.34), decay, 0.001);

  ratios.forEach((r) => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = base * r;
    osc.connect(banda);
    osc.start(time);
    osc.stop(time + decay + 0.06);
  });

  banda.connect(hp).connect(g);
  choke(engine, o.choke, time);
  registerChoke(engine, o.choke, g);
  route(engine, g, o);
}

function palmas(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const banda = ctx.createBiquadFilter();
  banda.type = 'bandpass';
  banda.frequency.value = 1180;
  banda.Q.value = 0.85;
  const salida = ctx.createGain();
  salida.gain.value = 1;
  banda.connect(salida);

  // Tres palmas muy juntas + cola: así suena un grupo, no una sola mano
  [0, 0.011, 0.024].forEach((offset, i) => {
    const ruido = noiseSource(engine, time + offset, 0.03);
    const g = ctx.createGain();
    hit(ctx, g, time + offset, nivel * (0.5 - i * 0.08), 0.02, 0.001);
    ruido.connect(g).connect(banda);
    ruido.stop(time + offset + 0.04);
  });
  const cola = noiseSource(engine, time + 0.03, 0.22);
  const gCola = ctx.createGain();
  hit(ctx, gCola, time + 0.03, nivel * 0.3, 0.16, 0.002);
  cola.connect(gCola).connect(banda);
  cola.stop(time + 0.28);

  route(engine, salida, { ...o, send: o.send ?? 0.2 });
}

function tom(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const pitch = o.pitch ?? 160;
  const decay = o.decay ?? 0.34;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitch * 1.9, time);
  osc.frequency.exponentialRampToValueAtTime(pitch, time + 0.09);
  const g = ctx.createGain();
  hit(ctx, g, time, nivel * 0.8, decay, 0.003);
  osc.connect(g);
  osc.start(time);
  osc.stop(time + decay + 0.08);

  const piel = noiseSource(engine, time, 0.05);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  const gPiel = ctx.createGain();
  hit(ctx, gPiel, time, nivel * 0.14, 0.04, 0.001);
  piel.connect(lp).connect(gPiel).connect(g);
  piel.stop(time + 0.08);

  route(engine, g, { ...o, send: o.send ?? 0.16 });
}

function diana(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const banda = ctx.createBiquadFilter();
  banda.type = 'bandpass';
  banda.frequency.value = o.color ?? 1100;
  banda.Q.value = 3;
  const g = ctx.createGain();
  hit(ctx, g, time, nivel * 0.42, o.decay ?? 0.24, 0.001);
  [o.pitch ?? 540, (o.pitch ?? 540) * 1.5].forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.connect(banda);
    osc.start(time);
    osc.stop(time + (o.decay ?? 0.24) + 0.05);
  });
  banda.connect(g);
  route(engine, g, { ...o, send: o.send ?? 0.18 });
}

// El 808: sub con caída de tono, glissando opcional y saturación
function sub(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const freq = o.freq ?? noteFreq(o.midi ?? 33);
  const decay = o.decay ?? 0.75;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const arranque = o.glide ? freq * o.glide : freq * 2.4;
  osc.frequency.setValueAtTime(arranque, time);
  osc.frequency.exponentialRampToValueAtTime(freq, time + (o.glide ? 0.14 : 0.05));

  const g = ctx.createGain();
  hit(ctx, g, time, nivel * 0.7, decay, 0.006);
  const sat = drive(ctx, o.drive ?? 0.22);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;

  osc.connect(g).connect(sat).connect(lp);
  osc.start(time);
  osc.stop(time + decay + 0.12);
  route(engine, lp, o);
}

function shaker(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const decay = o.decay ?? 0.075;
  const ruido = noiseSource(engine, time, decay + 0.05);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 5200;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 8200;
  bp.Q.value = 1.2;
  const g = ctx.createGain();
  // El shaker no golpea: entra y sale
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(nivel * 0.26, time + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  ruido.connect(hp).connect(bp).connect(g);
  ruido.stop(time + decay + 0.06);
  route(engine, g, o);
}

// ---------- Teclas ----------

// Pulsación FM: portadora sinusoidal + modulador que se apaga rápido
function tecla(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const freq = o.freq ?? noteFreq(o.midi ?? 60);
  const decay = o.decay ?? 1.1;

  const portadora = ctx.createOscillator();
  portadora.type = 'sine';
  portadora.frequency.value = freq;

  const modulador = ctx.createOscillator();
  modulador.type = 'sine';
  modulador.frequency.value = freq * (o.ratio ?? 2);
  const indice = ctx.createGain();
  indice.gain.setValueAtTime(freq * (o.brillo ?? 2.6), time);
  indice.gain.exponentialRampToValueAtTime(freq * 0.05, time + 0.28);
  modulador.connect(indice).connect(portadora.frequency);

  const cuerpo = ctx.createOscillator();
  cuerpo.type = 'triangle';
  cuerpo.frequency.value = freq * 1.002;
  const gCuerpo = ctx.createGain();
  gCuerpo.gain.value = 0.35;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(nivel * 0.4, time + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, time + decay);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(5200, time);
  lp.frequency.exponentialRampToValueAtTime(900, time + decay * 0.7);

  portadora.connect(g);
  cuerpo.connect(gCuerpo).connect(g);
  g.connect(lp);

  [portadora, modulador, cuerpo].forEach((osc) => {
    osc.start(time);
    osc.stop(time + decay + 0.1);
  });
  route(engine, lp, { ...o, send: o.send ?? 0.28 });
}

// Acorde corto de tres notas: el clásico stab de sampler
function acorde(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const raiz = o.midi ?? 60;
  const grados = o.grados ?? [0, 3, 7];
  const decay = o.decay ?? 0.5;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(nivel * 0.3, time + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(4200, time);
  lp.frequency.exponentialRampToValueAtTime(1100, time + decay);

  grados.forEach((semis) => {
    [-6, 6].forEach((cents) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = noteFreq(raiz + semis) * 2 ** (cents / 1200);
      osc.connect(g);
      osc.start(time);
      osc.stop(time + decay + 0.08);
    });
  });
  g.connect(lp);
  route(engine, lp, { ...o, send: o.send ?? 0.3 });
}

// ---------- Efectos ----------

function barrido(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const dur = o.dur ?? 1.4;
  const ruido = noiseSource(engine, time, dur + 0.05);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(o.desde ?? 320, time);
  bp.frequency.exponentialRampToValueAtTime(o.hasta ?? 7200, time + dur);
  bp.Q.value = 2.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(nivel * 0.32, time + dur * 0.92);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.06);
  ruido.connect(bp).connect(g);
  ruido.stop(time + dur + 0.08);
  route(engine, g, { ...o, send: o.send ?? 0.3 });
}

function laser(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const dur = o.dur ?? 0.3;
  const osc = ctx.createOscillator();
  osc.type = o.tipo ?? 'sawtooth';
  osc.frequency.setValueAtTime(o.desde ?? 1400, time);
  osc.frequency.exponentialRampToValueAtTime(o.hasta ?? 90, time + dur);
  const g = ctx.createGain();
  hit(ctx, g, time, nivel * 0.28, dur, 0.004);
  osc.connect(g);
  osc.start(time);
  osc.stop(time + dur + 0.05);
  route(engine, g, { ...o, send: o.send ?? 0.25 });
}

function sirena(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const dur = o.dur ?? 1.3;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = o.centro ?? 720;
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = o.vel ?? 3.4;
  const prof = ctx.createGain();
  prof.gain.value = o.prof ?? 260;
  lfo.connect(prof).connect(osc.frequency);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1400;
  bp.Q.value = 1.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(nivel * 0.16, time + 0.08);
  g.gain.setValueAtTime(nivel * 0.16, time + dur - 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(bp).connect(g);
  [osc, lfo].forEach((n) => {
    n.start(time);
    n.stop(time + dur + 0.05);
  });
  route(engine, g, { ...o, send: o.send ?? 0.25 });
}

// Bocina de aire: sierras desafinadas con vibrato y un pequeño bend
function bocina(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const dur = o.dur ?? 0.85;
  const base = o.freq ?? 370;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(nivel * 0.2, time + 0.05);
  g.gain.setValueAtTime(nivel * 0.2, time + dur - 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 5.5;
  const profVib = ctx.createGain();
  profVib.gain.value = 6;
  vibrato.start(time);
  vibrato.stop(time + dur);

  [1, 1.005, 1.5, 2.01].forEach((mult, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base * mult * 0.94, time);
    osc.frequency.exponentialRampToValueAtTime(base * mult, time + 0.1);
    profVib.connect(osc.frequency);
    const gi = ctx.createGain();
    gi.gain.value = i === 0 ? 1 : 0.4 / i;
    osc.connect(gi).connect(g);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  });
  vibrato.connect(profVib);

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900;
  bp.Q.value = 0.8;
  g.connect(bp);
  route(engine, bp, { ...o, send: o.send ?? 0.22 });
}

// Rasgado de vinilo: ruido con la velocidad de lectura yendo y viniendo
function scratch(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const dur = o.dur ?? 0.34;
  const src = ctx.createBufferSource();
  src.buffer = engine.noise;
  src.playbackRate.setValueAtTime(0.4, time);
  src.playbackRate.linearRampToValueAtTime(2.6, time + dur * 0.35);
  src.playbackRate.linearRampToValueAtTime(0.5, time + dur * 0.7);
  src.playbackRate.linearRampToValueAtTime(1.6, time + dur);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(900, time);
  bp.frequency.linearRampToValueAtTime(2600, time + dur * 0.5);
  bp.frequency.linearRampToValueAtTime(1100, time + dur);
  bp.Q.value = 2.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(nivel * 0.34, time + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  src.connect(bp).connect(g);
  src.start(time, Math.random() * 1.2, dur + 0.1);
  src.stop(time + dur + 0.05);
  route(engine, g, o);
}

// Golpe de película: sub que cae + reventón de ruido con mucha reverb
function impacto(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(26, time + 0.7);
  const g = ctx.createGain();
  hit(ctx, g, time, nivel * 0.9, 0.9, 0.006);
  osc.connect(g);
  osc.start(time);
  osc.stop(time + 1);

  const ruido = noiseSource(engine, time, 0.5);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2400, time);
  lp.frequency.exponentialRampToValueAtTime(300, time + 0.5);
  const gRuido = ctx.createGain();
  hit(ctx, gRuido, time, nivel * 0.4, 0.45, 0.002);
  ruido.connect(lp).connect(gRuido).connect(g);
  ruido.stop(time + 0.55);

  route(engine, g, { ...o, send: o.send ?? 0.45 });
}

// Plato del revés: el ruido crece y se corta en seco
function reversa(engine, time, o = {}) {
  const { ctx } = engine;
  const nivel = o.gain ?? 1;
  const dur = o.dur ?? 1.1;
  const ruido = noiseSource(engine, time, dur + 0.05);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2600;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(nivel * 0.3, time + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.05);
  ruido.connect(hp).connect(g);
  ruido.stop(time + dur + 0.08);
  route(engine, g, { ...o, send: o.send ?? 0.35 });
}

// Caída de sub: el 808 resbalando hacia abajo
function caida(engine, time, o = {}) {
  sub(engine, time, { ...o, midi: o.midi ?? 36, glide: 1, decay: o.decay ?? 1.2, drive: 0.3 });
}

const VOCES = {
  bombo,
  caja,
  rim,
  metal,
  palmas,
  tom,
  diana,
  sub,
  shaker,
  tecla,
  acorde,
  barrido,
  laser,
  sirena,
  bocina,
  scratch,
  impacto,
  reversa,
  caida,
};

// Redoble: la misma voz repetida dentro de un pulso
export function redoble(engine, voz, time, opts = {}, veces = 8, dur = 0.5) {
  for (let i = 0; i < veces; i += 1) {
    const t = time + (dur / veces) * i;
    const nivel = (opts.gain ?? 1) * (0.45 + (i / veces) * 0.55);
    triggerVoice(engine, voz, t, { ...opts, gain: nivel });
  }
}

export function triggerVoice(engine, voz, time, opts = {}) {
  const fn = VOCES[voz];
  if (!engine || !fn) return;
  fn(engine, time, opts);
}

export const VOICE_NAMES = Object.keys(VOCES);
