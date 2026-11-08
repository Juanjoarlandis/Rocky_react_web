import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyPattern, encodePattern } from '../../utils/beatCodec.js';
import Barra from './Barra.jsx';
import * as chat from '../../api/chat.js';

vi.mock('../../api/chat.js', () => ({ requestBarra: vi.fn() }));

const TONO = { id: 'sol', label: 'Sol m', midi: 67 };
const VERSOS = [
  'Verso uno de la colmena',
  'verso dos que suena',
  'verso tres sin prisa',
  'verso cuatro con risa',
];
const pattern = () => {
  const p = emptyPattern();
  p[0][0] = 3;
  return p;
};

afterEach(() => vi.clearAllMocks());

function renderBarra(props = {}) {
  return render(
    <Barra
      pattern={pattern()}
      bpm={90}
      swing={0}
      tonality={TONO}
      playing={false}
      step={-1}
      {...props}
    />
  );
}

describe('Rocky IA te escribe una barra', () => {
  it('con la mesa vacía no se puede pedir', () => {
    render(
      <Barra
        pattern={emptyPattern()}
        bpm={90}
        swing={0}
        tonality={TONO}
        playing={false}
        step={-1}
      />
    );
    expect(screen.getByRole('button', { name: 'Rocky IA, rapéame' })).toBeDisabled();
  });

  it('manda el beat de la mesa y enseña los cuatro versos', async () => {
    chat.requestBarra.mockResolvedValue({ versos: VERSOS });
    renderBarra();
    fireEvent.click(screen.getByRole('button', { name: 'Rocky IA, rapéame' }));
    expect(await screen.findByText('Verso uno de la colmena')).toBeInTheDocument();
    expect(chat.requestBarra).toHaveBeenCalledWith({
      code: encodePattern(pattern()),
      bpm: 90,
      swing: 0,
      tono: 'sol',
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('con la mesa sonando, cada compás enciende el verso siguiente', async () => {
    chat.requestBarra.mockResolvedValue({ versos: VERSOS });
    const { rerender } = renderBarra();
    fireEvent.click(screen.getByRole('button', { name: 'Rocky IA, rapéame' }));
    await screen.findByText('Verso uno de la colmena');
    const tocando = (step) =>
      rerender(
        <Barra pattern={pattern()} bpm={90} swing={0} tonality={TONO} playing step={step} />
      );
    tocando(0);
    expect(screen.getByText('Verso uno de la colmena')).toHaveClass('is-now');
    tocando(8);
    tocando(15);
    tocando(0);
    expect(screen.getByText('verso dos que suena')).toHaveClass('is-now');
    expect(screen.getByText('Verso uno de la colmena')).not.toHaveClass('is-now');
  });

  it('si Rocky IA no puede, lo dice y deja reintentar', async () => {
    chat.requestBarra.mockRejectedValue(new Error('Rocky IA ha rapeado mucho hoy. Vuelve mañana.'));
    renderBarra();
    fireEvent.click(screen.getByRole('button', { name: 'Rocky IA, rapéame' }));
    expect(await screen.findByText(/rapeado mucho hoy/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Probar otra vez' })).toBeEnabled();
  });
});
