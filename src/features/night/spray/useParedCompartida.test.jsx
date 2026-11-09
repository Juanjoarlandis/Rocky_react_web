import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useParedCompartida } from './useParedCompartida.js';

const json = (body, { status = 200, etag = null } = {}) =>
  Promise.resolve(
    new Response(status === 304 ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...(etag ? { ETag: etag } : {}) },
    })
  );

const PARED = {
  enabled: true,
  version: 3,
  firma: 'LUNA-7',
  strokes: [{ id: 'aaaaaaaaaaa', c: 0, s: 1, p: [0, 10], d: [], firma: 'TELE-2' }],
  firmas: [{ firma: 'TELE-2', mia: false }],
};

describe('useParedCompartida', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('carga la pared de su página y ancho', async () => {
    const fetchMock = vi.fn(() => json(PARED, { etag: '"3-LUNA-7"' }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useParedCompartida({ pagina: '/crew', ancho: 'ancha' }));
    await waitFor(() => expect(result.current.compartida).toBe(true));
    expect(result.current.strokes).toEqual(PARED.strokes);
    expect(result.current.firma).toBe('LUNA-7');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/pared?pagina=%2Fcrew&ancho=ancha');
  });

  it('apagada o sin servidor, no comparte', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json({ enabled: false }))
    );
    const apagada = renderHook(() => useParedCompartida({ pagina: '/crew', ancho: 'ancha' }));
    await waitFor(() => expect(apagada.result.current.compartida).toBe(false));
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    );
    const caida = renderHook(() => useParedCompartida({ pagina: '/estudio', ancho: 'ancha' }));
    await waitFor(() => expect(caida.result.current.compartida).toBe(false));
  });

  it('vuelve a mirar cada 20 s con el ETag y, si no cambió, no toca nada', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => json(PARED, { etag: '"3-LUNA-7"' }))
      .mockImplementation(() => json(null, { status: 304 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useParedCompartida({ pagina: '/crew', ancho: 'ancha' }));
    await waitFor(() => expect(result.current.compartida).toBe(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers['If-None-Match']).toBe('"3-LUNA-7"');
    expect(result.current.strokes).toEqual(PARED.strokes);
  });

  it('pintar añade el trazo con su id y firma; deshacer lo quita', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => json(PARED, { etag: '"3-x"' }))
      .mockImplementationOnce(() =>
        json({ id: 'bbbbbbbbbbb', firma: 'LUNA-7', version: 4 }, { status: 201 })
      )
      .mockImplementationOnce(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useParedCompartida({ pagina: '/crew', ancho: 'ancha' }));
    await waitFor(() => expect(result.current.compartida).toBe(true));
    const trazo = { c: 1, s: 2, p: [5, 50], d: [] };
    await act(async () => {
      await result.current.pintar(trazo);
    });
    expect(result.current.strokes.at(-1)).toEqual({ ...trazo, id: 'bbbbbbbbbbb', firma: 'LUNA-7' });
    expect(result.current.firma).toBe('LUNA-7');
    await act(async () => {
      await result.current.deshacer('bbbbbbbbbbb');
    });
    expect(result.current.strokes.map((s) => s.id)).toEqual(['aaaaaaaaaaa']);
    expect(fetchMock.mock.calls[2][1].method).toBe('DELETE');
  });

  it('si pintar falla, el error sube y la pared no cambia', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => json(PARED, { etag: '"3-x"' }))
        .mockImplementationOnce(() =>
          json({ message: 'Demasiadas', code: 'WALL_DAILY_LIMIT' }, { status: 429 })
        )
    );
    const { result } = renderHook(() => useParedCompartida({ pagina: '/crew', ancho: 'ancha' }));
    await waitFor(() => expect(result.current.compartida).toBe(true));
    await expect(result.current.pintar({ c: 0, s: 1, p: [0, 0], d: [] })).rejects.toThrow();
    expect(result.current.strokes).toEqual(PARED.strokes);
  });

  it('tras un fallo pasajero vuelve a compartir aunque la pared no haya cambiado', async () => {
    // 200 → caída (un despliegue) → 304: la pared sigue igual y vuelve a estar.
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => json(PARED, { etag: '"3-LUNA-7"' }))
      .mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
      .mockImplementation(({ headers } = {}) =>
        headers?.['If-None-Match']
          ? json(null, { status: 304 })
          : json(PARED, { etag: '"3-LUNA-7"' })
      );
    vi.stubGlobal('fetch', (url, init) => fetchMock(init));
    const { result } = renderHook(() => useParedCompartida({ pagina: '/crew', ancho: 'ancha' }));
    await waitFor(() => expect(result.current.compartida).toBe(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(result.current.compartida).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(result.current.compartida).toBe(true);
    expect(result.current.strokes).toEqual(PARED.strokes);
  });

  it('un vistazo que sale antes de pintar no borra el trazo recién subido', async () => {
    let soltarVistazo;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => json(PARED, { etag: '"3-x"' }))
      // El vistazo de los 20 s se queda colgado hasta después de pintar
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            soltarVistazo = () => resolve(json(PARED, { etag: '"3-x"' }));
          })
      )
      .mockImplementationOnce(() =>
        json({ id: 'bbbbbbbbbbb', firma: 'LUNA-7', version: 4 }, { status: 201 })
      );
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useParedCompartida({ pagina: '/crew', ancho: 'ancha' }));
    await waitFor(() => expect(result.current.compartida).toBe(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    await act(async () => {
      await result.current.pintar({ c: 1, s: 2, p: [5, 50], d: [] });
    });
    await act(async () => {
      soltarVistazo();
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.strokes.map((s) => s.id)).toContain('bbbbbbbbbbb');
  });
});
