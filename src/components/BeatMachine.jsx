import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMusic } from '../context/MusicContext';
import { IconPlay, IconPause } from './Boombox';
import breakdanceFreeze from '../images/optimized/characters/breakdance-freeze-600.webp';
import {
    STEP_COUNT,
    clampBpm,
    decodePattern,
    emptyPattern,
    encodePattern,
} from '../utils/beatCodec';
import '../styles/BeatMachine.css';

// LA MESA DE BEATS — caja de ritmos dibujada a mano.
// Los cuatro sonidos se sintetizan con Web Audio en el momento: cero samples.

const TRACKS_INFO = [
    { id: 'bombo', label: 'Bombo' },
    { id: 'caja', label: 'Caja' },
    { id: 'hat', label: 'Hi-hat' },
    { id: 'diana', label: 'Diana' },
];

// Beat de fábrica: boom bap sencillito para que suene bien al primer play
const DEFAULT_CODE = '2481101055559000';

const STORAGE_KEY = 'rocky-mesa-beats';
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

// ---------- Sintetizadores (una función por pista) ----------

function playKick(ctx, destination, time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    osc.connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + 0.3);
}

function makeNoiseBuffer(ctx) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

function playSnare(ctx, destination, time, noiseBuffer) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1800;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    noise.connect(band).connect(noiseGain).connect(destination);
    noise.start(time);
    noise.stop(time + 0.2);

    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(190, time);
    bodyGain.gain.setValueAtTime(0.4, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    body.connect(bodyGain).connect(destination);
    body.start(time);
    body.stop(time + 0.14);
}

function playHat(ctx, destination, time, noiseBuffer) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 7500;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.32, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    noise.connect(highpass).connect(gain).connect(destination);
    noise.start(time);
    noise.stop(time + 0.07);
}

function playDiana(ctx, destination, time) {
    // Campana metálica tipo cencerro: dos cuadradas desafinadas + bandpass
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1000;
    band.Q.value = 2.5;
    [540, 810].forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(band);
        osc.start(time);
        osc.stop(time + 0.16);
    });
    band.connect(gain).connect(destination);
}

function initialPattern(searchParams) {
    const fromUrl = decodePattern(searchParams.get('beat'));
    if (fromUrl) return fromUrl;
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        const fromStorage = saved && decodePattern(saved.code);
        if (fromStorage) return fromStorage;
    } catch {
        // localStorage corrupto: ignoramos y vamos al beat de fábrica
    }
    return decodePattern(DEFAULT_CODE) || emptyPattern();
}

function initialBpm(searchParams) {
    if (searchParams.get('bpm')) return clampBpm(searchParams.get('bpm'));
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (saved?.bpm) return clampBpm(saved.bpm);
    } catch {
        // sin guardado previo
    }
    return 95;
}

function BeatMachine() {
    const [searchParams] = useSearchParams();
    const [pattern, setPattern] = useState(() => initialPattern(searchParams));
    const [bpm, setBpm] = useState(() => initialBpm(searchParams));
    const [playing, setPlaying] = useState(false);
    const [uiStep, setUiStep] = useState(-1);
    const [copiado, setCopiado] = useState(false);
    const { pause: pauseRadio } = useMusic();

    const audioRef = useRef({ ctx: null, master: null, noise: null });
    const seqRef = useRef({ timer: null, nextTime: 0, step: 0 });
    const patternRef = useRef(pattern);
    const bpmRef = useRef(bpm);
    patternRef.current = pattern;
    bpmRef.current = bpm;

    // Guardamos cada cambio en el navegador
    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ code: encodePattern(pattern), bpm })
            );
        } catch {
            // almacenamiento lleno o bloqueado: no pasa nada
        }
    }, [pattern, bpm]);

    const ensureAudio = () => {
        const audio = audioRef.current;
        if (!audio.ctx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            const ctx = new Ctx();
            const compressor = ctx.createDynamicsCompressor();
            const master = ctx.createGain();
            master.gain.value = 0.9;
            master.connect(compressor).connect(ctx.destination);
            audio.ctx = ctx;
            audio.master = master;
            audio.noise = makeNoiseBuffer(ctx);
        }
        if (audio.ctx.state === 'suspended') {
            audio.ctx.resume();
        }
        return audio;
    };

    const disparar = (trackIndex, time) => {
        const { ctx, master, noise } = audioRef.current;
        if (!ctx) return;
        if (trackIndex === 0) playKick(ctx, master, time);
        if (trackIndex === 1) playSnare(ctx, master, time, noise);
        if (trackIndex === 2) playHat(ctx, master, time, noise);
        if (trackIndex === 3) playDiana(ctx, master, time);
    };

    const scheduler = () => {
        const audio = audioRef.current;
        const seq = seqRef.current;
        if (!audio.ctx) return;
        while (seq.nextTime < audio.ctx.currentTime + SCHEDULE_AHEAD) {
            const step = seq.step;
            const when = seq.nextTime;
            patternRef.current.forEach((track, trackIndex) => {
                if (track[step]) disparar(trackIndex, when);
            });
            const delay = Math.max(0, (when - audio.ctx.currentTime) * 1000);
            setTimeout(() => setUiStep(step), delay);
            seq.nextTime += 60 / bpmRef.current / 4;
            seq.step = (step + 1) % STEP_COUNT;
        }
    };

    const start = () => {
        const audio = ensureAudio();
        pauseRadio();
        const seq = seqRef.current;
        seq.step = 0;
        seq.nextTime = audio.ctx.currentTime + 0.06;
        seq.timer = setInterval(scheduler, LOOKAHEAD_MS);
        setPlaying(true);
    };

    const stop = () => {
        const seq = seqRef.current;
        if (seq.timer) clearInterval(seq.timer);
        seq.timer = null;
        setPlaying(false);
        setUiStep(-1);
    };

    // Al salir de La Colmena paramos el beat y soltamos el contexto de audio
    useEffect(() => () => {
        const seq = seqRef.current;
        if (seq.timer) clearInterval(seq.timer);
        seq.timer = null;
        const audio = audioRef.current;
        if (audio.ctx && audio.ctx.state !== 'closed') {
            audio.ctx.close().catch(() => {});
        }
        audio.ctx = null;
    }, []);

    const togglePlay = () => (playing ? stop() : start());

    const toggleCell = (trackIndex, step) => {
        setPattern((prev) => {
            const nuevo = prev.map((track) => [...track]);
            nuevo[trackIndex][step] = nuevo[trackIndex][step] ? 0 : 1;
            // Al encender una celda, la escuchas al momento
            if (nuevo[trackIndex][step]) {
                const audio = ensureAudio();
                disparar(trackIndex, audio.ctx.currentTime + 0.01);
            }
            return nuevo;
        });
    };

    const limpiar = () => setPattern(emptyPattern());

    const compartir = async () => {
        const url = `${window.location.origin}/estudio?beat=${encodePattern(pattern)}&bpm=${bpm}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2400);
        } catch {
            window.prompt('Copia el enlace de tu beat:', url);
        }
    };

    // El Freeze baila a la velocidad del beat (un balanceo cada 2 pulsos)
    const danceStyle = useMemo(
        () => ({
            animationDuration: `${(60 / bpm) * 2}s`,
            animationPlayState: playing ? 'running' : 'paused',
        }),
        [bpm, playing]
    );

    return (
        <div className="mesa-wrap">
            <img
                src={breakdanceFreeze}
                alt=""
                className="mesa-dancer"
                style={danceStyle}
            />
            <div className="mesa">
                <div className="mesa-grid" role="grid" aria-label="Secuenciador de 16 pasos">
                    {TRACKS_INFO.map((info, trackIndex) => (
                        <div className="mesa-row" role="row" key={info.id}>
                            <span className="mesa-label">{info.label}</span>
                            <div className="mesa-cells">
                                {pattern[trackIndex].map((on, step) => (
                                    <button
                                        // eslint-disable-next-line react/no-array-index-key
                                        key={step}
                                        type="button"
                                        role="gridcell"
                                        className={[
                                            'mesa-cell',
                                            on ? 'on' : '',
                                            info.id === 'diana' && on ? 'roja' : '',
                                            step % 4 === 0 ? 'marca' : '',
                                            step === uiStep ? 'actual' : '',
                                        ].join(' ')}
                                        aria-pressed={Boolean(on)}
                                        aria-label={`${info.label}, paso ${step + 1}`}
                                        onClick={() => toggleCell(trackIndex, step)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mesa-hint" aria-hidden="true">desliza la rejilla →</p>

                <div className="mesa-controls">
                    <button
                        type="button"
                        className="player-btn player-btn-main mesa-play"
                        onClick={togglePlay}
                        aria-label={playing ? 'Parar el beat' : 'Reproducir el beat'}
                    >
                        {playing ? <IconPause /> : <IconPlay />}
                    </button>
                    <label className="mesa-bpm">
                        <span className="mesa-bpm-valor">{bpm} BPM</span>
                        <input
                            type="range"
                            min="70"
                            max="160"
                            value={bpm}
                            onChange={(e) => setBpm(clampBpm(e.target.value))}
                            aria-label="Tempo en pulsos por minuto"
                        />
                    </label>
                    <div className="mesa-acciones">
                        <button type="button" className="btn btn-ghost" onClick={limpiar}>
                            Limpiar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={compartir}>
                            {copiado ? '¡Copiado!' : 'Compartir beat'}
                        </button>
                    </div>
                </div>
                <p className="mesa-nota">
                    * Sonidos cocinados en el navegador. Comparte el enlace y tu beat se abre sonando.
                </p>
            </div>
        </div>
    );
}

export default BeatMachine;
