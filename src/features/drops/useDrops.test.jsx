import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDrops } from './useDrops.js';

const SERVER_NOW = Date.parse('2026-11-13T18:59:00Z');
const LAUNCH = '2026-11-13T20:00:00+01:00'; // 19:00Z, un minuto después

const payload = (state, now = SERVER_NOW) => ({
  now: new Date(now).toISOString(),
  featured: { handle: 'rocky-drop-6', state, launchAt: LAUNCH },
  drops: [
    {
      handle: 'rocky-drop-6',
      number: 6,
      title: 'ROCKY DROP 6',
      state,
      launchAt: LAUNCH,
      endsAt: null,
      designCount: 2,
      designs: state === 'anunciado' ? null : ['rocky-el-jefe', 'rocky-en-las-nubes'],
      soldOut: false,
    },
  ],
});

function respond(body) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

describe('useDrops', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // El reloj del navegador va 10 minutos adelantado respecto al servidor.
    vi.setSystemTime(SERVER_NOW + 10 * 60_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('en Shopify pide los drops y corrige el reloj con la hora del servidor', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respond(payload('anunciado')));
    const { result } = renderHook(() => useDrops({ mode: 'shopify', products: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.featured.handle).toBe('rocky-drop-6');
    expect(Math.abs(result.current.serverNow() - SERVER_NOW)).toBeLessThan(2_000);
  });

  it('al llegar la hora vuelve a pedir los drops y avisa para recargar el catálogo', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => respond(payload('anunciado')))
      .mockImplementation(() => respond(payload('en-la-calle', SERVER_NOW + 61_000)));
    const onLaunch = vi.fn();
    const { result } = renderHook(() => useDrops({ mode: 'shopify', products: [], onLaunch }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(62_000);
    });
    await waitFor(() => expect(result.current.drops[0].state).toBe('en-la-calle'));
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it('si el servidor aún no ha cambiado, reintenta a los 5 y a los 15 s', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => respond(payload('anunciado')))
      .mockImplementationOnce(() => respond(payload('anunciado', SERVER_NOW + 61_000)))
      .mockImplementationOnce(() => respond(payload('anunciado', SERVER_NOW + 66_000)))
      .mockImplementation(() => respond(payload('en-la-calle', SERVER_NOW + 81_000)));
    const { result } = renderHook(() => useDrops({ mode: 'shopify', products: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(62_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    await waitFor(() => expect(result.current.drops[0].state).toBe('en-la-calle'));
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('en demo no llama al servidor y enseña los drops de demostración', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const products = [{ handle: 'rocky-35-red', dropHandle: 'rocky-drop-4' }];
    const { result } = renderHook(() => useDrops({ mode: 'demo', products }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.drops.map((drop) => drop.state)).toEqual([
      'anunciado',
      'en-la-calle',
      'archivo',
    ]);
    expect(result.current.featured.handle).toBe('rocky-drop-4');
  });

  it('si el servidor falla, se queda sin drops y lo dice', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response('{}', { status: 502, headers: { 'Content-Type': 'application/json' } })
      )
    );
    const { result } = renderHook(() => useDrops({ mode: 'shopify', products: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.drops).toEqual([]);
    expect(result.current.error).not.toBe('');
  });

  it('mientras se comprueba el modo de la tienda no pide nada', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useDrops({ mode: 'checking', products: [] }));
    expect(result.current.loading).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
