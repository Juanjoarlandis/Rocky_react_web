import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMusic } from '../context/MusicContext';
import { IconPlay, IconPause } from './Boombox';
import BeatPads from './BeatPads';
import { createEngine } from '../audio/engine';
import { redoble, triggerVoice } from '../audio/voices';
import {
    BANCOS,
    PAD_TECLAS,
    PRESETS,
    TONALIDADES,
    TRACKS,
    TRACK_IDS,
    VELOCIDADES,
    padsDelBanco,
} from '../data/mesa';
import {
    STEP_COUNT,
    clampBpm,
    clampSwing,
    decodePattern,
    emptyPattern,
    encodePattern,
    patternFromRows,
} from '../utils/beatCodec';
import breakdanceFreeze from '../images/optimized/characters/breakdance-freeze-600.webp';
import '../styles/components/beat-machine.css';

// LA MESA DE BEATS — la caja de ritmos de La Colmena.
// Secuenciador de 8 pistas con velocidad y swing, 16 pads tocables con el
// teclado, grabación al vuelo y mezclador. Todo sintetizado: cero samples.

const STORAGE_KEY = 'rocky-mesa-beats';
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;
const PRESET_INICIAL = PRESETS[0];

// Al pinchar una celda va rotando: silencio → golpe → acento → fantasma
const CICLO = [0, 2, 3, 1];

function leerGuardado() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
        // almacenamiento corrupto o bloqueado: arrancamos de fábrica
        return null;
    }
}

function estadoInicial(searchParams) {
    const guardado = leerGuardado();
    const pattern =
        decodePattern(searchParams.get('beat')) ||
        decodePattern(guardado?.code) ||
        patternFromRows(PRESET_INICIAL.rows, TRACK_IDS);
    const tonoId = searchParams.get('tono') || guardado?.tono;
    const tonalidad = TONALIDADES.find((t) => t.id === tonoId) || TONALIDADES[0];
    return {
        pattern,
        bpm: clampBpm(searchParams.get('bpm') ?? guardado?.bpm ?? PRESET_INICIAL.bpm),
        swing: clampSwing(searchParams.get('swing') ?? guardado?.swing ?? PRESET_INICIAL.swing),
        tonalidad,
        niveles: TRACKS.map((_, i) => guardado?.niveles?.[i] ?? 0.85),
        mudas: TRACKS.map((_, i) => Boolean(guardado?.mudas?.[i])),
    };
}

// Un patrón nuevo que suene a algo: bombo con criterio, caja en su sitio
// y hats con fantasmas. Nunca sale ruido blanco.
function patronAleatorio() {
    const p = emptyPattern();
    p[0][0] = 3;
    [3, 6, 7, 10, 11, 14].forEach((s) => {
        if (Math.random() < 0.34) p[0][s] = Math.random() < 0.3 ? 3 : 2;
    });
    p[1][4] = 3;
    p[1][12] = 3;
    if (Math.random() < 0.4) p[1][Math.random() < 0.5 ? 7 : 14] = 1;
    const paso = Math.random() < 0.45 ? 1 : 2;
    for (let s = 0; s < STEP_COUNT; s += paso) {
        p[2][s] = Math.random() < 0.22 ? 1 : 2;
    }
    if (Math.random() < 0.6) p[5][10] = 2;
    if (Math.random() < 0.45) p[4][4] = 2;
    if (Math.random() < 0.5) {
        p[7][0] = 3;
        p[7][Math.random() < 0.5 ? 8 : 10] = 2;
    }
    if (Math.random() < 0.3) p[6][15] = 1;
    return p;
}

function BeatMachine() {
    const [searchParams] = useSearchParams();
    const [inicial] = useState(() => estadoInicial(searchParams));

    const [pattern, setPattern] = useState(inicial.pattern);
    const [bpm, setBpm] = useState(inicial.bpm);
    const [swing, setSwing] = useState(inicial.swing);
    const [tonalidad, setTonalidad] = useState(inicial.tonalidad);
    const [niveles, setNiveles] = useState(inicial.niveles);
    const [mudas, setMudas] = useState(inicial.mudas);
    const [solos, setSolos] = useState(() => TRACKS.map(() => false));
    const [volumen, setVolumen] = useState(0.85);
    const [playing, setPlaying] = useState(false);
    const [grabando, setGrabando] = useState(false);
    const [uiStep, setUiStep] = useState(-1);
    const [banco, setBanco] = useState('kit');
    const [padActivo, setPadActivo] = useState(null);
    const [copiado, setCopiado] = useState(false);
    const [presetActivo, setPresetActivo] = useState(PRESET_INICIAL.id);

    const { pause: pauseRadio } = useMusic();

    const engineRef = useRef(null);
    const seqRef = useRef({ timer: null, raf: null, nextTime: 0, step: 0, tiempo0: 0, cola: [] });
    const wrapRef = useRef(null);
    const vuRef = useRef(null);
    const tapsRef = useRef([]);
    const flashRef = useRef(null);
    const copiadoRef = useRef(null);

    // Espejos para el planificador, que corre fuera del ciclo de React
    const patternRef = useRef(pattern);
    const bpmRef = useRef(bpm);
    const swingRef = useRef(swing);
    const tonicaRef = useRef(tonalidad.midi);
    const mezclaRef = useRef({ mudas, solos });
    const grabandoRef = useRef(grabando);
    patternRef.current = pattern;
    bpmRef.current = bpm;
    swingRef.current = swing;
    tonicaRef.current = tonalidad.midi;
    mezclaRef.current = { mudas, solos };
    grabandoRef.current = grabando;

    const pads = useMemo(() => padsDelBanco(banco, tonalidad.midi), [banco, tonalidad]);
    const haySolo = solos.some(Boolean);
    const audible = (i) => (haySolo ? solos[i] : !mudas[i]);

    // ---------- Guardado ----------

    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    code: encodePattern(pattern),
                    bpm,
                    swing,
                    tono: tonalidad.id,
                    niveles,
                    mudas,
                })
            );
        } catch {
            // sin sitio o en modo privado: seguimos sin guardar
        }
    }, [pattern, bpm, swing, tonalidad, niveles, mudas]);

    // ---------- Audio ----------

    const ensureEngine = useCallback(() => {
        if (!engineRef.current) {
            const engine = createEngine();
            if (!engine) return null;
            engineRef.current = engine;
            engine.setMasterLevel(volumen);
            TRACKS.forEach((track, i) => {
                const { mudas: m, solos: s } = mezclaRef.current;
                const vivo = s.some(Boolean) ? s[i] : !m[i];
                engine.setTrackLevel(track.id, vivo ? niveles[i] : 0);
            });
        }
        engineRef.current.resume();
        return engineRef.current;
    }, [niveles, volumen]);

    // El mezclador se refleja en los buses en cuanto tocas un mando
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;
        TRACKS.forEach((track, i) => {
            const vivo = solos.some(Boolean) ? solos[i] : !mudas[i];
            engine.setTrackLevel(track.id, vivo ? niveles[i] : 0);
        });
    }, [niveles, mudas, solos]);

    useEffect(() => {
        engineRef.current?.setMasterLevel(volumen);
    }, [volumen]);

    const dispararPista = useCallback((indice, time, velocidad) => {
        const engine = engineRef.current;
        if (!engine) return;
        const track = TRACKS[indice];
        const opts = {
            ...track.opts,
            gain: VELOCIDADES[velocidad] ?? VELOCIDADES[2],
            out: engine.busFor(track.id),
        };
        if (track.usaTonica) opts.midi = tonicaRef.current - 24;
        triggerVoice(engine, track.voz, time, opts);
    }, []);

    // ---------- Transporte ----------

    const pasoDur = () => 60 / bpmRef.current / 4;

    const planificar = useCallback(() => {
        const engine = engineRef.current;
        const seq = seqRef.current;
        if (!engine) return;
        const { ctx } = engine;
        while (seq.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
            const step = seq.step;
            const dur = pasoDur();
            // El swing retrasa las semicorcheas impares: eso es el groove
            const cuando = seq.nextTime + (step % 2 ? swingRef.current * dur * 0.5 : 0);
            if (step === 0) seq.tiempo0 = seq.nextTime;

            patternRef.current.forEach((track, indice) => {
                const { mudas: m, solos: s } = mezclaRef.current;
                const vivo = s.some(Boolean) ? s[indice] : !m[indice];
                if (track[step] && vivo) dispararPista(indice, cuando, track[step]);
            });

            seq.cola.push({ step, cuando });
            seq.nextTime += dur;
            seq.step = (step + 1) % STEP_COUNT;
        }
    }, [dispararPista]);

    // Un solo bucle de pintura para el cabezal y el vúmetro
    const pintar = useCallback(() => {
        const engine = engineRef.current;
        const seq = seqRef.current;
        if (engine) {
            const ahora = engine.ctx.currentTime;
            while (seq.cola.length && seq.cola[0].cuando <= ahora) {
                setUiStep(seq.cola.shift().step);
            }
            if (vuRef.current) {
                vuRef.current.style.setProperty('--nivel', engine.level().toFixed(3));
            }
        }
        seq.raf = requestAnimationFrame(pintar);
    }, []);

    const start = useCallback(() => {
        const engine = ensureEngine();
        if (!engine) return;
        pauseRadio();
        const seq = seqRef.current;
        seq.step = 0;
        seq.cola = [];
        seq.nextTime = engine.ctx.currentTime + 0.08;
        seq.tiempo0 = seq.nextTime;
        clearInterval(seq.timer);
        seq.timer = setInterval(planificar, LOOKAHEAD_MS);
        if (!seq.raf) seq.raf = requestAnimationFrame(pintar);
        setPlaying(true);
    }, [ensureEngine, pauseRadio, pintar, planificar]);

    const stop = useCallback(() => {
        const seq = seqRef.current;
        clearInterval(seq.timer);
        seq.timer = null;
        seq.cola = [];
        setPlaying(false);
        setGrabando(false);
        setUiStep(-1);
    }, []);

    const togglePlay = useCallback(() => {
        if (playing) stop();
        else start();
    }, [playing, start, stop]);

    // Al salir de La Colmena: paramos, soltamos el bucle y cerramos el audio
    useEffect(
        () => () => {
            const seq = seqRef.current;
            clearInterval(seq.timer);
            if (seq.raf) cancelAnimationFrame(seq.raf);
            seq.timer = null;
            seq.raf = null;
            clearTimeout(flashRef.current);
            clearTimeout(copiadoRef.current);
            engineRef.current?.close();
            engineRef.current = null;
        },
        []
    );

    // ---------- Pads ----------

    const golpearPad = useCallback(
        (pad) => {
            const engine = ensureEngine();
            if (!engine) return;
            const cuando = engine.ctx.currentTime + 0.015;
            const opts = {
                ...pad.opts,
                gain: pad.opts?.gain ?? 1,
                out: pad.track ? engine.busFor(pad.track) : engine.padBus,
            };
            if (pad.redoble) {
                const dur = (60 / bpmRef.current) * pad.redoble.pulsos;
                redoble(engine, pad.voz, cuando, opts, pad.redoble.veces, dur);
            } else {
                triggerVoice(engine, pad.voz, cuando, opts);
            }

            setPadActivo(pad.id);
            clearTimeout(flashRef.current);
            flashRef.current = setTimeout(() => setPadActivo(null), 130);

            // Con REC encendido, lo que tocas cae cuantizado en la rejilla
            const indice = TRACK_IDS.indexOf(pad.track);
            if (grabandoRef.current && seqRef.current.timer && indice >= 0) {
                const seq = seqRef.current;
                const pos = (engine.ctx.currentTime - seq.tiempo0) / pasoDur();
                const paso = ((Math.round(pos) % STEP_COUNT) + STEP_COUNT) % STEP_COUNT;
                setPattern((prev) => {
                    const nuevo = prev.map((track) => [...track]);
                    nuevo[indice][paso] = 3;
                    return nuevo;
                });
            }
        },
        [ensureEngine]
    );

    // Teclado: 1234 / QWER / ASDF / ZXCV tocan los pads; espacio arranca
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
            const destino = e.target;
            const editable =
                destino instanceof HTMLElement &&
                (destino.isContentEditable ||
                    ['INPUT', 'TEXTAREA', 'SELECT'].includes(destino.tagName));
            if (editable) return;

            if (e.key === ' ' && wrapRef.current?.contains(destino)) {
                e.preventDefault();
                togglePlay();
                return;
            }
            const indice = PAD_TECLAS.indexOf(e.key.toLowerCase());
            if (indice >= 0 && pads[indice]) {
                e.preventDefault();
                golpearPad(pads[indice]);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [golpearPad, pads, togglePlay]);

    // ---------- Edición ----------

    const tocarCelda = (indice, paso, velocidad) => {
        const actual = patternRef.current[indice][paso];
        const siguiente =
            velocidad !== undefined
                ? velocidad
                : CICLO[(CICLO.indexOf(actual) + 1) % CICLO.length];
        setPattern((prev) =>
            prev.map((track, i) =>
                i === indice ? track.map((v, s) => (s === paso ? siguiente : v)) : track
            )
        );
        // Al encender una celda la escuchas al momento
        if (siguiente) {
            const engine = ensureEngine();
            if (engine) dispararPista(indice, engine.ctx.currentTime + 0.01, siguiente);
        }
        setPresetActivo(null);
    };

    const cargarPreset = (preset) => {
        setPattern(patternFromRows(preset.rows, TRACK_IDS));
        setBpm(preset.bpm);
        setSwing(preset.swing);
        setPresetActivo(preset.id);
    };

    const limpiar = () => {
        setPattern(emptyPattern());
        setPresetActivo(null);
    };

    const aleatorio = () => {
        setPattern(patronAleatorio());
        setPresetActivo(null);
    };

    // Tempo a golpes: marcas cuatro veces y la mesa saca el BPM
    const tap = () => {
        const ahora = performance.now();
        const taps = tapsRef.current.filter((t) => ahora - t < 2400);
        taps.push(ahora);
        tapsRef.current = taps.slice(-5);
        if (tapsRef.current.length >= 2) {
            const huecos = tapsRef.current
                .slice(1)
                .map((t, i) => t - tapsRef.current[i]);
            const media = huecos.reduce((a, b) => a + b, 0) / huecos.length;
            setBpm(clampBpm(60000 / media));
            setPresetActivo(null);
        }
    };

    const compartir = async () => {
        const url = `${window.location.origin}/estudio?beat=${encodePattern(pattern)}&bpm=${bpm}&swing=${swing}&tono=${tonalidad.id}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            clearTimeout(copiadoRef.current);
            copiadoRef.current = setTimeout(() => setCopiado(false), 2400);
        } catch {
            window.prompt('Copia el enlace de tu beat:', url);
        }
    };

    // El Freeze baila a la velocidad del beat (un balanceo cada 2 pulsos)
    const danceStyle = {
        animationDuration: `${(60 / bpm) * 2}s`,
        animationPlayState: playing ? 'running' : 'paused',
    };

    return (
        <div className="doodle-shelf mesa-wrap" ref={wrapRef}>
            <img src={breakdanceFreeze} alt="" className="doodle mesa-dancer neon-art" style={danceStyle} />

            <div className="mesa">
                <header className="mesa-cabecera">
                    <div className="mesa-marca">
                        <span className="mesa-marca-nombre">ROCKY</span>
                        <span className="mesa-marca-modelo">MPC-035</span>
                    </div>

                    <div className="mesa-lcd" aria-hidden="true">
                        <div className="lcd-datos">
                            <span><b>{bpm}</b> bpm</span>
                            <span><b>{Math.round(swing * 100)}</b>% swing</span>
                            <span><b>{tonalidad.label}</b></span>
                            <span className={grabando ? 'lcd-rec on' : 'lcd-rec'}>
                                {grabando ? '● REC' : playing ? '▶ PLAY' : '■ STOP'}
                            </span>
                        </div>
                        <div className="lcd-pasos">
                            {Array.from({ length: STEP_COUNT }, (_, i) => (
                                <i key={i} className={i === uiStep ? 'on' : ''} />
                            ))}
                        </div>
                    </div>

                    <div className="mesa-vu" ref={vuRef} aria-hidden="true">
                        {Array.from({ length: 10 }, (_, i) => (
                            <i key={i} style={{ '--umbral': (i + 1) / 10 }} />
                        ))}
                    </div>
                </header>

                <div className="mesa-transporte">
                    <button
                        type="button"
                        className={`mesa-play ${playing ? 'sonando' : ''}`}
                        onClick={togglePlay}
                        aria-label={playing ? 'Parar el beat' : 'Reproducir el beat'}
                    >
                        {playing ? <IconPause /> : <IconPlay />}
                    </button>
                    <button
                        type="button"
                        className={`mesa-rec ${grabando ? 'on' : ''}`}
                        onClick={() => setGrabando((g) => !g)}
                        aria-pressed={grabando}
                        title="Graba en la rejilla lo que toques en los pads"
                    >
                        <span className="mesa-led" aria-hidden="true" />
                        REC
                    </button>
                    <button type="button" className="mesa-tap" onClick={tap}>
                        TAP
                    </button>

                    <label className="mesa-mando">
                        <span className="mando-nombre">Tempo</span>
                        <input
                            type="range"
                            min="60"
                            max="180"
                            value={bpm}
                            onChange={(e) => {
                                setBpm(clampBpm(e.target.value));
                                setPresetActivo(null);
                            }}
                            aria-label="Tempo en pulsos por minuto"
                        />
                        <span className="mando-valor">{bpm}</span>
                    </label>

                    <label className="mesa-mando">
                        <span className="mando-nombre">Swing</span>
                        <input
                            type="range"
                            min="0"
                            max="0.7"
                            step="0.01"
                            value={swing}
                            onChange={(e) => {
                                setSwing(clampSwing(e.target.value));
                                setPresetActivo(null);
                            }}
                            aria-label="Cantidad de swing"
                        />
                        <span className="mando-valor">{Math.round(swing * 100)}%</span>
                    </label>

                    <label className="mesa-mando">
                        <span className="mando-nombre">Volumen</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volumen}
                            onChange={(e) => setVolumen(Number(e.target.value))}
                            aria-label="Volumen general"
                        />
                        <span className="mando-valor">{Math.round(volumen * 100)}</span>
                    </label>
                </div>

                <div className="mesa-presets" role="group" aria-label="Ritmos de fábrica">
                    <span className="mesa-presets-titulo">Ritmos</span>
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            className={`chip ${presetActivo === preset.id ? 'on' : ''}`}
                            onClick={() => cargarPreset(preset)}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                <div className="mesa-seq">
                    <div className="seq-scroll">
                        <div className="seq-regla" aria-hidden="true">
                            <span className="seq-hueco" />
                            <div className="seq-numeros">
                                {Array.from({ length: STEP_COUNT }, (_, i) => (
                                    <span key={i} className={i % 4 === 0 ? 'fuerte' : ''}>
                                        {i % 4 === 0 ? i / 4 + 1 : '·'}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="seq-rejilla" role="grid" aria-label="Secuenciador de 16 pasos">
                            {TRACKS.map((track, indice) => (
                                <div
                                    className={`seq-fila ${audible(indice) ? '' : 'apagada'}`}
                                    role="row"
                                    key={track.id}
                                >
                                    <div className="seq-cabeza">
                                        <button
                                            type="button"
                                            className={`pista-nombre ${mudas[indice] ? 'muda' : ''}`}
                                            onClick={() =>
                                                setMudas((prev) =>
                                                    prev.map((m, i) => (i === indice ? !m : m))
                                                )
                                            }
                                            aria-pressed={mudas[indice]}
                                            title={`${mudas[indice] ? 'Activar' : 'Silenciar'} ${track.label}`}
                                        >
                                            {track.label}
                                        </button>
                                        <button
                                            type="button"
                                            className={`pista-solo ${solos[indice] ? 'on' : ''}`}
                                            onClick={() =>
                                                setSolos((prev) =>
                                                    prev.map((s, i) => (i === indice ? !s : s))
                                                )
                                            }
                                            aria-pressed={solos[indice]}
                                            aria-label={`Solo de ${track.label}`}
                                        >
                                            S
                                        </button>
                                        <input
                                            className="pista-nivel"
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={niveles[indice]}
                                            onChange={(e) =>
                                                setNiveles((prev) =>
                                                    prev.map((n, i) =>
                                                        i === indice ? Number(e.target.value) : n
                                                    )
                                                )
                                            }
                                            aria-label={`Volumen de ${track.label}`}
                                        />
                                    </div>

                                    <div className="seq-celdas">
                                        {pattern[indice].map((vel, paso) => (
                                            <button
                                                // eslint-disable-next-line react/no-array-index-key
                                                key={paso}
                                                type="button"
                                                role="gridcell"
                                                className={[
                                                    'celda',
                                                    vel ? `v${vel}` : '',
                                                    track.acento ? 'acento' : '',
                                                    paso % 4 === 0 ? 'marca' : '',
                                                    paso === uiStep ? 'actual' : '',
                                                ].join(' ')}
                                                aria-pressed={Boolean(vel)}
                                                aria-label={`${track.label}, paso ${paso + 1}`}
                                                onClick={() => tocarCelda(indice, paso)}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    tocarCelda(indice, paso, 0);
                                                }}
                                            >
                                                <span className="celda-luz" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <p className="seq-pista">
                        Pincha para encender · vuelve a pinchar para acento y fantasma · botón derecho borra
                    </p>
                </div>

                <section className="mesa-pads-zona" aria-label="Pads">
                    <div className="pads-barra">
                        <div className="pads-bancos" role="group" aria-label="Banco de sonidos">
                            {BANCOS.map((b) => (
                                <button
                                    key={b.id}
                                    type="button"
                                    className={`chip ${banco === b.id ? 'on' : ''}`}
                                    onClick={() => setBanco(b.id)}
                                    aria-pressed={banco === b.id}
                                >
                                    {b.label}
                                </button>
                            ))}
                        </div>
                        <label className="pads-tono">
                            <span>Tono</span>
                            <select
                                value={tonalidad.id}
                                onChange={(e) =>
                                    setTonalidad(
                                        TONALIDADES.find((t) => t.id === e.target.value) || TONALIDADES[0]
                                    )
                                }
                            >
                                {TONALIDADES.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <BeatPads pads={pads} teclas={PAD_TECLAS} onHit={golpearPad} activo={padActivo} />

                    <p className="pads-nota">
                        Toca con el teclado: <b>1 2 3 4</b> · <b>Q W E R</b> · <b>A S D F</b> · <b>Z X C V</b>.
                        Con <b>REC</b> encendido, lo que toques se graba en la rejilla.
                    </p>
                </section>

                <footer className="mesa-pie">
                    <div className="mesa-acciones">
                        <button type="button" className="btn btn-ghost" onClick={limpiar}>
                            Limpiar
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={aleatorio}>
                            Sorpréndeme
                        </button>
                        <button type="button" className="btn btn-primary" onClick={compartir}>
                            {copiado ? '¡Copiado!' : 'Compartir beat'}
                        </button>
                    </div>
                    <p className="mesa-nota">
                        * Sonidos cocinados en el navegador, sin un solo sample. Comparte el enlace y tu beat se abre sonando.
                    </p>
                </footer>
            </div>
        </div>
    );
}

export default BeatMachine;
