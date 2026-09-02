import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyPattern, STEP_COUNT } from '../../utils/beatCodec';
import { useStepSequencer } from './useStepSequencer';

// A 120 bpm cada semicorchea dura 125 ms; el primer paso cae 80 ms tras el play.
const BPM = 120;
const STEP_MS = 125;
const FIRST_STEP_AT = 0.08;

/* El reloj del AudioContext avanza con los temporizadores falsos: así el
   planificador ve pasar el tiempo sin necesidad de Web Audio. */
function fakeEngine() {
  const t0 = Date.now();
  return {
    ctx: {
      get currentTime() {
        return (Date.now() - t0) / 1000;
      },
    },
    level: () => 0.4,
  };
}

function patronDePrueba() {
  const pattern = emptyPattern();
  pattern[0][0] = 3;
  pattern[1][1] = 2;
  pattern[2][2] = 1;
  return pattern;
}

function montar(props = {}) {
  const trigger = vi.fn();
  const onFrame = vi.fn();
  const hook = renderHook(
    (p) =>
      useStepSequencer({
        pattern: patronDePrueba(),
        bpm: BPM,
        swing: 0,
        trigger,
        onFrame,
        ...p,
      }),
    { initialProps: props }
  );
  return { ...hook, trigger, onFrame };
}

function avanzar(ms) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('useStepSequencer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('arranca y agenda el primer paso por delante del reloj', () => {
    const { result, trigger } = montar();
    expect(result.current.playing).toBe(false);
    expect(result.current.step).toBe(-1);

    act(() => result.current.start(fakeEngine()));
    expect(result.current.playing).toBe(true);
    expect(result.current.isRunning()).toBe(true);

    // Al primer tic del planificador ya está agendado el golpe del paso 0
    avanzar(25);
    expect(trigger).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveBeenCalledWith(0, expect.closeTo(FIRST_STEP_AT, 3), 3);
  });

  it('sin motor no arranca', () => {
    const { result } = montar();
    act(() => result.current.start(null));
    expect(result.current.playing).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('avanza los pasos al ritmo del tempo y mueve el cabezal cuando suenan', () => {
    const { result, trigger, onFrame } = montar();
    act(() => result.current.start(fakeEngine()));

    // Ha sonado el paso 0 (80 ms) y el 1 (205 ms), pero el 2 (330 ms) aún no
    avanzar(300);
    expect(result.current.step).toBe(1);
    expect(trigger).toHaveBeenCalledWith(1, expect.closeTo(FIRST_STEP_AT + 0.125, 3), 2);
    // El planificador va por delante del cabezal: el paso 2 ya está agendado
    expect(trigger).toHaveBeenCalledWith(2, expect.closeTo(FIRST_STEP_AT + 0.25, 3), 1);

    // El paso 2 ya ha sonado y el vúmetro se ha pintado a cada frame
    avanzar(STEP_MS);
    expect(result.current.step).toBe(2);
    expect(onFrame).toHaveBeenCalled();

    // Un compás entero después vuelve a empezar por el paso 0
    avanzar(STEP_MS * (STEP_COUNT - 2));
    expect(result.current.step).toBe(0);
    expect(trigger.mock.calls.filter(([track]) => track === 0)).toHaveLength(2);
  });

  it('cuantiza un instante al paso más cercano del compás', () => {
    const { result } = montar();
    const engine = fakeEngine();
    act(() => result.current.start(engine));
    avanzar(25);

    expect(result.current.stepDuration()).toBeCloseTo(0.125, 5);
    expect(result.current.stepAt(FIRST_STEP_AT)).toBe(0);
    expect(result.current.stepAt(FIRST_STEP_AT + 0.125 * 3.4)).toBe(3);
    // Da la vuelta al compás
    expect(result.current.stepAt(FIRST_STEP_AT + 0.125 * STEP_COUNT)).toBe(0);
  });

  it('respeta el swing: las semicorcheas impares se retrasan', () => {
    const { result, trigger } = montar({ swing: 0.5 });
    act(() => result.current.start(fakeEngine()));
    avanzar(200);

    const [, cuandoBombo] = trigger.mock.calls.find(([track]) => track === 0);
    const [, cuandoCaja] = trigger.mock.calls.find(([track]) => track === 1);
    // El paso par va a tiempo; el impar, medio swing de semicorchea tarde
    expect(cuandoBombo).toBeCloseTo(FIRST_STEP_AT, 3);
    expect(cuandoCaja).toBeCloseTo(FIRST_STEP_AT + 0.125 + 0.5 * 0.125 * 0.5, 3);
  });

  it('sigue el tempo y el patrón en vivo sin reiniciar', () => {
    const { result, rerender, trigger } = montar();
    act(() => result.current.start(fakeEngine()));
    avanzar(25);

    // Se dobla el tempo y se apaga la caja: el siguiente paso llega antes y en silencio
    const pattern = patronDePrueba();
    pattern[1][1] = 0;
    rerender({ bpm: 240, pattern });
    avanzar(100);

    expect(trigger).not.toHaveBeenCalledWith(1, expect.anything(), expect.anything());
    expect(result.current.stepDuration()).toBeCloseTo(0.0625, 5);
  });

  it('para: deja de agendar y apaga el cabezal', () => {
    const { result, trigger } = montar();
    act(() => result.current.start(fakeEngine()));
    avanzar(100);
    expect(result.current.step).toBe(0);

    act(() => result.current.stop());
    expect(result.current.playing).toBe(false);
    expect(result.current.step).toBe(-1);
    expect(result.current.isRunning()).toBe(false);

    const llamadas = trigger.mock.calls.length;
    avanzar(1000);
    expect(trigger).toHaveBeenCalledTimes(llamadas);
  });

  it('al desmontar suelta el intervalo y el bucle de pintura', () => {
    const { result, unmount } = montar();
    act(() => result.current.start(fakeEngine()));
    avanzar(50);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
