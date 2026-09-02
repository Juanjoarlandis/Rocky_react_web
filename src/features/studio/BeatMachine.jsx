import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMusic } from '../../context/MusicContext';
import { IconPlay, IconPause } from '../../components/Boombox';
import BeatPads from './BeatPads';
import { createEngine } from '../../audio/engine';
import { applyMix, hitPad, isAudible, trackIndexOf, triggerTrack } from './audio/drumKit';
import { useStepSequencer } from './useStepSequencer';
import {
    BANCOS,
    PAD_TECLAS,
    PRESETS,
    TONALIDADES,
    TRACKS,
    TRACK_IDS,
    padsDelBanco,
} from '../../data/mesa';
import {
    BPM_MAX,
    BPM_MIN,
    STEP_COUNT,
    SWING_MAX,
    SWING_MIN,
    clampBpm,
    clampSwing,
    decodePattern,
    emptyPattern,
    encodePattern,
    patternFromRows,
} from '../../utils/beatCodec';
import breakdanceFreeze from '../../images/optimized/characters/breakdance-freeze-600.webp';
import '../../styles/BeatMachine.css';

// LA MESA DE BEATS — la caja de ritmos de La Colmena.
// Secuenciador de 8 pistas con velocidad y swing, 16 pads tocables con el
// teclado, grabación al vuelo y mezclador. Todo sintetizado: cero samples.
// Aquí sólo vive la interfaz: el transporte está en useStepSequencer y el
// kit que traduce pistas y pads a voces, en audio/drumKit.

const STORAGE_KEY = 'rocky-mesa-beats';
const INITIAL_PRESET = PRESETS[0];

// Al pinchar una celda va rotando: silencio → golpe → acento → fantasma
const CYCLE = [0, 2, 3, 1];

function readSaved() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
        // almacenamiento corrupto o bloqueado: arrancamos de fábrica
        return null;
    }
}

function initialState(searchParams) {
    const saved = readSaved();
    const pattern =
        decodePattern(searchParams.get('beat')) ||
        decodePattern(saved?.code) ||
        patternFromRows(INITIAL_PRESET.rows, TRACK_IDS);
    const tonalityId = searchParams.get('tono') || saved?.tono;
    const tonality = TONALIDADES.find((t) => t.id === tonalityId) || TONALIDADES[0];
    return {
        pattern,
        bpm: clampBpm(searchParams.get('bpm') ?? saved?.bpm ?? INITIAL_PRESET.bpm),
        swing: clampSwing(searchParams.get('swing') ?? saved?.swing ?? INITIAL_PRESET.swing),
        tonality,
        levels: TRACKS.map((_, i) => saved?.niveles?.[i] ?? 0.85),
        mutes: TRACKS.map((_, i) => Boolean(saved?.mudas?.[i])),
    };
}

// Un patrón nuevo que suene a algo: bombo con criterio, caja en su sitio
// y hats con fantasmas. Nunca sale ruido blanco.
function randomPattern() {
    const p = emptyPattern();
    p[0][0] = 3;
    [3, 6, 7, 10, 11, 14].forEach((s) => {
        if (Math.random() < 0.34) p[0][s] = Math.random() < 0.3 ? 3 : 2;
    });
    p[1][4] = 3;
    p[1][12] = 3;
    if (Math.random() < 0.4) p[1][Math.random() < 0.5 ? 7 : 14] = 1;
    const stride = Math.random() < 0.45 ? 1 : 2;
    for (let s = 0; s < STEP_COUNT; s += stride) {
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
    const [initial] = useState(() => initialState(searchParams));

    const [pattern, setPattern] = useState(initial.pattern);
    const [bpm, setBpm] = useState(initial.bpm);
    const [swing, setSwing] = useState(initial.swing);
    const [tonality, setTonality] = useState(initial.tonality);
    const [levels, setLevels] = useState(initial.levels);
    const [mutes, setMutes] = useState(initial.mutes);
    const [solos, setSolos] = useState(() => TRACKS.map(() => false));
    const [volume, setVolume] = useState(0.85);
    const [recording, setRecording] = useState(false);
    const [bank, setBank] = useState('kit');
    const [activePad, setActivePad] = useState(null);
    const [copied, setCopied] = useState(false);
    const [activePreset, setActivePreset] = useState(INITIAL_PRESET.id);

    const { pause: pauseRadio } = useMusic();

    const engineRef = useRef(null);
    const wrapRef = useRef(null);
    const vuRef = useRef(null);
    const tapsRef = useRef([]);
    const flashRef = useRef(null);

    // Espejos para lo que corre fuera del ciclo de React (disparos, grabación)
    const tonicRef = useRef(tonality.midi);
    const mixRef = useRef({ mutes, solos });
    const recordingRef = useRef(recording);
    tonicRef.current = tonality.midi;
    mixRef.current = { mutes, solos };
    recordingRef.current = recording;

    const pads = useMemo(() => padsDelBanco(bank, tonality.midi), [bank, tonality]);
    const audible = (i) => isAudible(i, { mutes, solos });

    // ---------- Guardado ----------

    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    code: encodePattern(pattern),
                    bpm,
                    swing,
                    tono: tonality.id,
                    niveles: levels,
                    mudas: mutes,
                })
            );
        } catch {
            // sin sitio o en modo privado: seguimos sin guardar
        }
    }, [pattern, bpm, swing, tonality, levels, mutes]);

    // ---------- Audio ----------

    const ensureEngine = useCallback(() => {
        if (!engineRef.current) {
            const engine = createEngine();
            if (!engine) return null;
            engineRef.current = engine;
            engine.setMasterLevel(volume);
            applyMix(engine, { levels, ...mixRef.current });
        }
        engineRef.current.resume();
        return engineRef.current;
    }, [levels, volume]);

    // El mezclador se refleja en los buses en cuanto tocas un mando
    useEffect(() => {
        applyMix(engineRef.current, { levels, mutes, solos });
    }, [levels, mutes, solos]);

    useEffect(() => {
        engineRef.current?.setMasterLevel(volume);
    }, [volume]);

    // Disparo de una pista: si está callada por mute o solo, ni se agenda
    const trigger = useCallback((index, time, velocity) => {
        if (!isAudible(index, mixRef.current)) return;
        triggerTrack(engineRef.current, index, time, velocity, { tonic: tonicRef.current });
    }, []);

    // El vúmetro se pinta en el mismo bucle que el cabezal
    const paintMeter = useCallback((engine) => {
        if (vuRef.current) {
            vuRef.current.style.setProperty('--nivel', engine.level().toFixed(3));
        }
    }, []);

    // ---------- Transporte ----------

    const {
        playing,
        step: uiStep,
        start: startSequencer,
        stop: stopSequencer,
        isRunning,
        stepAt,
    } = useStepSequencer({ pattern, bpm, swing, trigger, onFrame: paintMeter });

    const start = useCallback(() => {
        const engine = ensureEngine();
        if (!engine) return;
        pauseRadio();
        startSequencer(engine);
    }, [ensureEngine, pauseRadio, startSequencer]);

    const stop = useCallback(() => {
        stopSequencer();
        setRecording(false);
    }, [stopSequencer]);

    const togglePlay = useCallback(() => {
        if (playing) stop();
        else start();
    }, [playing, start, stop]);

    // Al salir de La Colmena: apagamos el pad y cerramos el audio (el
    // secuenciador suelta su bucle solo)
    useEffect(
        () => () => {
            clearTimeout(flashRef.current);
            engineRef.current?.close();
            engineRef.current = null;
        },
        []
    );

    // ---------- Pads ----------

    const strikePad = useCallback(
        (pad) => {
            const engine = ensureEngine();
            if (!engine) return;
            const when = engine.ctx.currentTime + 0.015;
            hitPad(engine, pad, when, { bpm });

            setActivePad(pad.id);
            clearTimeout(flashRef.current);
            flashRef.current = setTimeout(() => setActivePad(null), 130);

            // Con REC encendido, lo que tocas cae cuantizado en la rejilla
            const index = trackIndexOf(pad);
            if (recordingRef.current && isRunning() && index >= 0) {
                const stepHit = stepAt(engine.ctx.currentTime);
                setPattern((prev) => {
                    const next = prev.map((track) => [...track]);
                    next[index][stepHit] = 3;
                    return next;
                });
            }
        },
        [bpm, ensureEngine, isRunning, stepAt]
    );

    // Teclado: 1234 / QWER / ASDF / ZXCV tocan los pads; espacio arranca
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
            const target = e.target;
            const editable =
                target instanceof HTMLElement &&
                (target.isContentEditable ||
                    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
            if (editable) return;

            if (e.key === ' ' && wrapRef.current?.contains(target)) {
                e.preventDefault();
                togglePlay();
                return;
            }
            const index = PAD_TECLAS.indexOf(e.key.toLowerCase());
            if (index >= 0 && pads[index]) {
                e.preventDefault();
                strikePad(pads[index]);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [strikePad, pads, togglePlay]);

    // ---------- Edición ----------

    const touchCell = (index, stepIndex, velocity) => {
        const current = pattern[index][stepIndex];
        const next =
            velocity !== undefined ? velocity : CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
        setPattern((prev) =>
            prev.map((track, i) =>
                i === index ? track.map((v, s) => (s === stepIndex ? next : v)) : track
            )
        );
        // Al encender una celda la escuchas al momento
        if (next) {
            const engine = ensureEngine();
            if (engine) {
                triggerTrack(engine, index, engine.ctx.currentTime + 0.01, next, {
                    tonic: tonicRef.current,
                });
            }
        }
        setActivePreset(null);
    };

    const loadPreset = (preset) => {
        setPattern(patternFromRows(preset.rows, TRACK_IDS));
        setBpm(preset.bpm);
        setSwing(preset.swing);
        setActivePreset(preset.id);
    };

    const clear = () => {
        setPattern(emptyPattern());
        setActivePreset(null);
    };

    const surprise = () => {
        setPattern(randomPattern());
        setActivePreset(null);
    };

    // Tempo a golpes: marcas cuatro veces y la mesa saca el BPM
    const tap = () => {
        const now = performance.now();
        const taps = tapsRef.current.filter((t) => now - t < 2400);
        taps.push(now);
        tapsRef.current = taps.slice(-5);
        if (tapsRef.current.length >= 2) {
            const gaps = tapsRef.current.slice(1).map((t, i) => t - tapsRef.current[i]);
            const average = gaps.reduce((a, b) => a + b, 0) / gaps.length;
            setBpm(clampBpm(60000 / average));
            setActivePreset(null);
        }
    };

    const share = async () => {
        const url = `${window.location.origin}/estudio?beat=${encodePattern(pattern)}&bpm=${bpm}&swing=${swing}&tono=${tonality.id}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2400);
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
        <div className="mesa-wrap" ref={wrapRef}>
            <img src={breakdanceFreeze} alt="" className="mesa-dancer neon-art" style={danceStyle} />

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
                            <span><b>{tonality.label}</b></span>
                            <span className={recording ? 'lcd-rec on' : 'lcd-rec'}>
                                {recording ? '● REC' : playing ? '▶ PLAY' : '■ STOP'}
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
                        className={`mesa-rec ${recording ? 'on' : ''}`}
                        onClick={() => setRecording((r) => !r)}
                        aria-pressed={recording}
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
                            min={BPM_MIN}
                            max={BPM_MAX}
                            value={bpm}
                            onChange={(e) => {
                                setBpm(clampBpm(e.target.value));
                                setActivePreset(null);
                            }}
                            aria-label="Tempo en pulsos por minuto"
                        />
                        <span className="mando-valor">{bpm}</span>
                    </label>

                    <label className="mesa-mando">
                        <span className="mando-nombre">Swing</span>
                        <input
                            type="range"
                            min={SWING_MIN}
                            max={SWING_MAX}
                            step="0.01"
                            value={swing}
                            onChange={(e) => {
                                setSwing(clampSwing(e.target.value));
                                setActivePreset(null);
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
                            value={volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                            aria-label="Volumen general"
                        />
                        <span className="mando-valor">{Math.round(volume * 100)}</span>
                    </label>
                </div>

                <div className="mesa-presets" role="group" aria-label="Ritmos de fábrica">
                    <span className="mesa-presets-titulo">Ritmos</span>
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            className={`chip ${activePreset === preset.id ? 'on' : ''}`}
                            onClick={() => loadPreset(preset)}
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
                            {TRACKS.map((track, index) => (
                                <div
                                    className={`seq-fila ${audible(index) ? '' : 'apagada'}`}
                                    role="row"
                                    key={track.id}
                                >
                                    <div className="seq-cabeza">
                                        <button
                                            type="button"
                                            className={`pista-nombre ${mutes[index] ? 'muda' : ''}`}
                                            onClick={() =>
                                                setMutes((prev) =>
                                                    prev.map((m, i) => (i === index ? !m : m))
                                                )
                                            }
                                            aria-pressed={mutes[index]}
                                            title={`${mutes[index] ? 'Activar' : 'Silenciar'} ${track.label}`}
                                        >
                                            {track.label}
                                        </button>
                                        <button
                                            type="button"
                                            className={`pista-solo ${solos[index] ? 'on' : ''}`}
                                            onClick={() =>
                                                setSolos((prev) =>
                                                    prev.map((s, i) => (i === index ? !s : s))
                                                )
                                            }
                                            aria-pressed={solos[index]}
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
                                            value={levels[index]}
                                            onChange={(e) =>
                                                setLevels((prev) =>
                                                    prev.map((n, i) =>
                                                        i === index ? Number(e.target.value) : n
                                                    )
                                                )
                                            }
                                            aria-label={`Volumen de ${track.label}`}
                                        />
                                    </div>

                                    <div className="seq-celdas">
                                        {pattern[index].map((vel, stepIndex) => (
                                            <button
                                                // eslint-disable-next-line react/no-array-index-key
                                                key={stepIndex}
                                                type="button"
                                                role="gridcell"
                                                className={[
                                                    'celda',
                                                    vel ? `v${vel}` : '',
                                                    track.acento ? 'acento' : '',
                                                    stepIndex % 4 === 0 ? 'marca' : '',
                                                    stepIndex === uiStep ? 'actual' : '',
                                                ].join(' ')}
                                                aria-pressed={Boolean(vel)}
                                                aria-label={`${track.label}, paso ${stepIndex + 1}`}
                                                onClick={() => touchCell(index, stepIndex)}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    touchCell(index, stepIndex, 0);
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
                                    className={`chip ${bank === b.id ? 'on' : ''}`}
                                    onClick={() => setBank(b.id)}
                                    aria-pressed={bank === b.id}
                                >
                                    {b.label}
                                </button>
                            ))}
                        </div>
                        <label className="pads-tono">
                            <span>Tono</span>
                            <select
                                value={tonality.id}
                                onChange={(e) =>
                                    setTonality(
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

                    <BeatPads pads={pads} teclas={PAD_TECLAS} onHit={strikePad} activo={activePad} />

                    <p className="pads-nota">
                        Toca con el teclado: <b>1 2 3 4</b> · <b>Q W E R</b> · <b>A S D F</b> · <b>Z X C V</b>.
                        Con <b>REC</b> encendido, lo que toques se graba en la rejilla.
                    </p>
                </section>

                <footer className="mesa-pie">
                    <div className="mesa-acciones">
                        <button type="button" className="btn btn-ghost" onClick={clear}>
                            Limpiar
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={surprise}>
                            Sorpréndeme
                        </button>
                        <button type="button" className="btn btn-primary" onClick={share}>
                            {copied ? '¡Copiado!' : 'Compartir beat'}
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
