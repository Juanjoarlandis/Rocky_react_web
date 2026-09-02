import { useCallback, useEffect, useRef, useState } from 'react';
import { STEP_COUNT } from '../../utils/beatCodec';

// EL SECUENCIADOR — el transporte de la mesa, sin saber qué suena.
//
// Planifica con lookahead sobre el reloj del AudioContext: un setInterval
// corto agenda los golpes que caen dentro de los próximos 120 ms y se los
// pasa al disparador con su tiempo exacto, así el ritmo no depende de que
// el hilo de la interfaz llegue puntual. Un solo bucle de pintura (rAF) va
// sacando de la cola los pasos que ya han sonado para mover el cabezal.
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

/* Recibe el patrón, el tempo y el swing en vivo, el disparador
   `trigger(trackIndex, when, velocity)` y un `onFrame(engine)` opcional para
   pintar algo más a cada frame (el vúmetro). El motor se le da al arrancar. */
export function useStepSequencer({
    pattern,
    bpm,
    swing,
    trigger,
    onFrame,
    stepCount = STEP_COUNT,
}) {
    const [playing, setPlaying] = useState(false);
    const [step, setStep] = useState(-1);
    const seqRef = useRef({
        engine: null,
        timer: null,
        raf: null,
        nextTime: 0,
        step: 0,
        barStart: 0,
        queue: [],
    });

    // Espejos para el planificador, que corre fuera del ciclo de React
    const liveRef = useRef(null);
    liveRef.current = { pattern, bpm, swing, trigger, onFrame };

    const stepDuration = useCallback(() => 60 / liveRef.current.bpm / 4, []);

    const schedule = useCallback(() => {
        const seq = seqRef.current;
        const { engine } = seq;
        if (!engine) return;
        const { ctx } = engine;
        while (seq.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
            const current = seq.step;
            const duration = stepDuration();
            // El swing retrasa las semicorcheas impares: eso es el groove
            const when =
                seq.nextTime + (current % 2 ? liveRef.current.swing * duration * 0.5 : 0);
            if (current === 0) seq.barStart = seq.nextTime;

            liveRef.current.pattern.forEach((track, index) => {
                if (track[current]) liveRef.current.trigger(index, when, track[current]);
            });

            seq.queue.push({ step: current, when });
            seq.nextTime += duration;
            seq.step = (current + 1) % stepCount;
        }
    }, [stepCount, stepDuration]);

    // Un solo bucle de pintura para el cabezal y lo que quiera pintar la mesa
    const paint = useCallback(() => {
        const seq = seqRef.current;
        const { engine } = seq;
        if (engine) {
            const now = engine.ctx.currentTime;
            let latest = null;
            while (seq.queue.length && seq.queue[0].when <= now) {
                latest = seq.queue.shift().step;
            }
            if (latest !== null) setStep(latest);
            liveRef.current.onFrame?.(engine);
        }
        seq.raf = requestAnimationFrame(paint);
    }, []);

    const start = useCallback(
        (engine) => {
            if (!engine) return;
            const seq = seqRef.current;
            seq.engine = engine;
            seq.step = 0;
            seq.queue = [];
            seq.nextTime = engine.ctx.currentTime + 0.08;
            seq.barStart = seq.nextTime;
            clearInterval(seq.timer);
            seq.timer = setInterval(schedule, LOOKAHEAD_MS);
            if (!seq.raf) seq.raf = requestAnimationFrame(paint);
            setPlaying(true);
        },
        [paint, schedule]
    );

    const stop = useCallback(() => {
        const seq = seqRef.current;
        clearInterval(seq.timer);
        seq.timer = null;
        seq.queue = [];
        setPlaying(false);
        setStep(-1);
    }, []);

    const isRunning = useCallback(() => seqRef.current.timer !== null, []);

    // Paso de la rejilla más cercano a un instante del reloj de audio, para
    // cuantizar lo que se toca con REC encendido. Sólo tiene sentido en marcha.
    const stepAt = useCallback(
        (time) => {
            const position = (time - seqRef.current.barStart) / stepDuration();
            return ((Math.round(position) % stepCount) + stepCount) % stepCount;
        },
        [stepCount, stepDuration]
    );

    // Al desmontar: se suelta el intervalo y el bucle de pintura
    useEffect(
        () => () => {
            const seq = seqRef.current;
            clearInterval(seq.timer);
            if (seq.raf) cancelAnimationFrame(seq.raf);
            seq.timer = null;
            seq.raf = null;
            seq.engine = null;
        },
        []
    );

    return { playing, step, start, stop, isRunning, stepAt, stepDuration };
}

export default useStepSequencer;
