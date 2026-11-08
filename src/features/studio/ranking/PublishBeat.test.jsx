import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyPattern, encodePattern } from '../../../utils/beatCodec.js';
import { onPublished } from '../mesaBus.js';
import PublishBeat from './PublishBeat.jsx';
import * as api from '../../../api/beats.js';

vi.mock('../../../api/beats.js', () => ({ publishBeat: vi.fn() }));

const TONO = { id: 'mi', label: 'Mi m', midi: 64 };
const pattern = () => {
  const p = emptyPattern();
  p[0][0] = 3;
  return p;
};

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('Publicar en el ranking', () => {
  it('con la mesa vacía no deja publicar', () => {
    render(<PublishBeat pattern={emptyPattern()} bpm={95} swing={0} tonality={TONO} />);
    expect(screen.getByRole('button', { name: 'Publicar en el ranking' })).toBeDisabled();
  });

  it('manda el beat de la mesa, recuerda el apodo y avisa al ranking', async () => {
    const published = vi.fn();
    const release = onPublished(published);
    api.publishBeat.mockResolvedValue({ beat: { id: 'abcdefghijk' }, duplicate: false });
    render(<PublishBeat pattern={pattern()} bpm={101} swing={0.3} tonality={TONO} />);
    fireEvent.click(screen.getByRole('button', { name: 'Publicar en el ranking' }));
    fireEvent.change(screen.getByLabelText('Nombre del beat'), { target: { value: 'Luz negra' } });
    fireEvent.change(screen.getByLabelText('Tu apodo'), { target: { value: 'mirón' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByText('Publicado. Ya suena en «Nuevos».')).toBeInTheDocument();
    expect(api.publishBeat).toHaveBeenCalledWith({
      code: encodePattern(pattern()),
      bpm: 101,
      swing: 0.3,
      tono: 'mi',
      name: 'Luz negra',
      alias: 'mirón',
      web: undefined,
    });
    expect(localStorage.getItem('rocky-beats-apodo')).toBe('mirón');
    expect(published).toHaveBeenCalledWith({ id: 'abcdefghijk' });
    release();
  });

  it('si el servidor lo rechaza, dice por qué', async () => {
    api.publishBeat.mockRejectedValue(
      new Error('Ese nombre no puede ir en el ranking. Prueba con otro.')
    );
    render(<PublishBeat pattern={pattern()} bpm={95} swing={0} tonality={TONO} />);
    fireEvent.click(screen.getByRole('button', { name: 'Publicar en el ranking' }));
    fireEvent.change(screen.getByLabelText('Nombre del beat'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Tu apodo'), { target: { value: 'yo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(await screen.findByText(/no puede ir en el ranking/)).toBeInTheDocument();
  });
});
