import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MusicProvider } from '../../music/MusicContext.jsx';
import { announcePublished } from '../mesaBus.js';
import Ranking from './Ranking.jsx';
import * as api from '../../../api/beats.js';

vi.mock('../../../api/beats.js', () => ({
  listBeats: vi.fn(),
  likeBeat: vi.fn(),
  reportBeat: vi.fn(),
  removeBeat: vi.fn(),
}));

const BEAT = {
  id: 'abcdefghijk',
  name: 'Barro a medianoche',
  alias: 'crew035',
  code: `2${'8'.padEnd(64, '0')}`,
  bpm: 92,
  swing: 0.2,
  tono: 're',
  likes: 4,
  weekLikes: 2,
  liked: false,
  mine: false,
};

function renderRanking(props = {}) {
  return render(
    <MusicProvider>
      <Ranking {...props} />
    </MusicProvider>
  );
}

afterEach(() => vi.clearAllMocks());

describe('El ranking de La Colmena', () => {
  it('enseña el top de la semana con su rejilla, su tempo y sus likes', async () => {
    api.listBeats.mockResolvedValue({ orden: 'semana', beats: [BEAT] });
    renderRanking();
    expect(await screen.findByText('Barro a medianoche')).toBeInTheDocument();
    expect(api.listBeats).toHaveBeenCalledWith('semana', expect.any(Object));
    expect(screen.getByText(/de crew035 · 92 BPM · Re m · 2 esta semana/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Me mola «Barro a medianoche» (4)' })
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('tab', { name: 'Top de la semana' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('el like se ve al momento y luego manda el servidor', async () => {
    api.listBeats.mockResolvedValue({ orden: 'semana', beats: [BEAT] });
    let resolveLike;
    api.likeBeat.mockReturnValue(new Promise((resolve) => (resolveLike = resolve)));
    renderRanking();
    fireEvent.click(await screen.findByRole('button', { name: /Me mola/ }));
    expect(
      screen.getByRole('button', { name: 'Me mola «Barro a medianoche» (5)' })
    ).toHaveAttribute('aria-pressed', 'true');
    await act(async () => resolveLike({ liked: true, likes: 9 }));
    expect(
      screen.getByRole('button', { name: 'Me mola «Barro a medianoche» (9)' })
    ).toBeInTheDocument();
  });

  it('reportar pide un segundo toque y quita el beat si queda oculto', async () => {
    api.listBeats.mockResolvedValue({ orden: 'semana', beats: [BEAT] });
    api.reportBeat.mockResolvedValue({ ok: true, hidden: true });
    renderRanking();
    fireEvent.click(await screen.findByRole('button', { name: 'Reportar' }));
    expect(api.reportBeat).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '¿Reportar?' }));
    await waitFor(() => expect(screen.queryByText('Barro a medianoche')).not.toBeInTheDocument());
    expect(screen.getByText('Gracias: lo miramos.')).toBeInTheDocument();
  });

  it('remezclar también pide confirmación antes de tocar tu mesa', async () => {
    api.listBeats.mockResolvedValue({ orden: 'semana', beats: [BEAT] });
    const onRemix = vi.fn();
    renderRanking({ onRemix });
    fireEvent.click(await screen.findByRole('button', { name: 'Remezclar' }));
    expect(onRemix).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '¿Sustituir tu mesa?' }));
    expect(onRemix).toHaveBeenCalledWith(BEAT);
  });

  it('sin beats invita a publicar; si el servidor falla, deja reintentar', async () => {
    api.listBeats.mockResolvedValueOnce({ orden: 'semana', beats: [] });
    renderRanking();
    expect(await screen.findByText(/Aún no hay beats/)).toBeInTheDocument();

    api.listBeats.mockRejectedValueOnce(new Error('caído'));
    fireEvent.click(screen.getByRole('tab', { name: 'Nuevos' }));
    expect(await screen.findByText(/no responde/)).toBeInTheDocument();
    api.listBeats.mockResolvedValueOnce({ orden: 'nuevos', beats: [BEAT] });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Barro a medianoche')).toBeInTheDocument();
  });

  it('al publicar un beat, salta a «Nuevos» y lo marca', async () => {
    api.listBeats.mockResolvedValue({ orden: 'semana', beats: [] });
    renderRanking();
    await screen.findByText(/Aún no hay beats/);
    api.listBeats.mockResolvedValue({ orden: 'nuevos', beats: [BEAT] });
    act(() => announcePublished(BEAT));
    expect(await screen.findByText('Barro a medianoche')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Nuevos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Barro a medianoche').closest('li')).toHaveClass('is-new');
  });
});
