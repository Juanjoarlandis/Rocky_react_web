// Un AudioContext de mentira para las pruebas: jsdom no trae Web Audio. Cada
// nodo apunta a qué se conecta, y los analizadores devuelven la señal que se
// les fije con `signal`, para comprobar vúmetros sin sonido de verdad.

function param(value = 0) {
  // Cada llamada queda apuntada con su tiempo, para comprobar rampas y cortes.
  const calls = [];
  const apunta =
    (nombre, cambia = true) =>
    (v, ...resto) => {
      calls.push([nombre, v, ...resto]);
      if (cambia) created.value = v;
    };
  const created = {
    value,
    calls,
    setValueAtTime: apunta('setValueAtTime'),
    setTargetAtTime: apunta('setTargetAtTime'),
    linearRampToValueAtTime: apunta('linearRampToValueAtTime'),
    exponentialRampToValueAtTime: apunta('exponentialRampToValueAtTime'),
    cancelScheduledValues: apunta('cancelScheduledValues', false),
  };
  return created;
}

function node(kind, extra = {}) {
  const created = {
    kind,
    connections: [],
    connect(target) {
      created.connections.push(target);
      return target;
    },
    disconnect() {
      created.connections = [];
    },
    ...extra,
  };
  return created;
}

export class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = 48_000;
    this.destination = node('destination');
    this.nodes = [];
    this.started = [];
  }

  track(created) {
    this.nodes.push(created);
    return created;
  }

  createGain() {
    return this.track(node('gain', { gain: param(1) }));
  }

  createAnalyser() {
    const analyser = node('analyser', {
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      signal: 0,
      getFloatTimeDomainData(data) {
        data.fill(analyser.signal);
      },
    });
    return this.track(analyser);
  }

  createDynamicsCompressor() {
    return this.track(
      node('compressor', {
        threshold: param(),
        knee: param(),
        ratio: param(),
        attack: param(),
        release: param(),
      })
    );
  }

  createWaveShaper() {
    return this.track(node('waveshaper', { curve: null, oversample: 'none' }));
  }

  createBiquadFilter() {
    return this.track(node('biquad', { type: 'lowpass', frequency: param(), Q: param() }));
  }

  createConvolver() {
    return this.track(node('convolver', { buffer: null }));
  }

  createBuffer(channels, length, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: (channel) => data[channel],
    };
  }

  createOscillator() {
    const oscillator = node('oscillator', {
      type: 'sine',
      frequency: param(440),
      detune: param(0),
      onended: null,
      start() {},
      stop(when = 0) {
        oscillator.stoppedAt = when;
      },
    });
    return this.track(oscillator);
  }

  createBufferSource() {
    const context = this;
    const source = node('source', {
      buffer: null,
      playbackRate: param(1),
      onended: null,
      start(when = 0, offset = 0, duration) {
        context.started.push({ source, when, offset, duration });
      },
      stop(when = 0) {
        source.stoppedAt = when;
      },
    });
    return this.track(source);
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}
