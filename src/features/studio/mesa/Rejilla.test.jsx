import { Profiler } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Rejilla from './Rejilla.jsx';
import { TRACKS } from '../../../data/mesa';
import { emptyPattern } from '../../../utils/beatCodec';
import { createStepStore } from '../useStepSequencer.js';

const celdasDelPaso = (paso) =>
  screen.getAllByRole('button', { name: new RegExp(`, paso ${paso}$`) });

function montar() {
  const steps = createStepStore();
  const onRender = vi.fn();
  const props = {
    pattern: emptyPattern(),
    steps,
    mutes: TRACKS.map(() => false),
    solos: TRACKS.map(() => false),
    levels: TRACKS.map(() => 0.8),
    audible: () => true,
    onMute: () => {},
    onSolo: () => {},
    onLevel: () => {},
    onCell: () => {},
  };
  const arbol = (extra = {}) => (
    <Profiler id="rejilla" onRender={onRender}>
      <Rejilla {...props} {...extra} />
    </Profiler>
  );
  const view = render(arbol());
  return { steps, onRender, rerender: (extra) => view.rerender(arbol(extra)) };
}

describe('La rejilla y el cabezal', () => {
  it('marca la columna que suena sin volver a pintar la rejilla', () => {
    const { steps, onRender } = montar();
    const pintadas = onRender.mock.calls.length;

    act(() => steps.set(2));
    celdasDelPaso(3).forEach((celda) => expect(celda).toHaveClass('is-current'));
    expect(document.querySelectorAll('.celda.is-current')).toHaveLength(TRACKS.length);

    act(() => steps.set(3));
    celdasDelPaso(3).forEach((celda) => expect(celda).not.toHaveClass('is-current'));
    celdasDelPaso(4).forEach((celda) => expect(celda).toHaveClass('is-current'));

    act(() => steps.set(-1));
    expect(document.querySelectorAll('.celda.is-current')).toHaveLength(0);
    expect(onRender).toHaveBeenCalledTimes(pintadas);
  });

  it('si la rejilla se vuelve a pintar a mitad de compás, la columna sigue marcada', () => {
    const { steps, rerender } = montar();
    act(() => steps.set(5));
    const pattern = emptyPattern();
    pattern[0][5] = 3;
    rerender({ pattern });
    celdasDelPaso(6).forEach((celda) => expect(celda).toHaveClass('is-current'));
    expect(celdasDelPaso(6)[0]).toHaveClass('v3');
  });
});
