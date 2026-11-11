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

  it('si falla la recarga al llegar la hora, conserva el muro y sigue reintentando', async () => {
    const fail = () =>
      Promise.resolve(
        new Response('{}', { status: 502, headers: { 'Content-Type': 'application/json' } })
      );
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => respond(payload('anunciado')))
      .mockImplementationOnce(fail)
      .mockImplementation(() => respond(payload('en-la-calle', SERVER_NOW + 66_000)));
    const onLaunch = vi.fn();
    const { result } = renderHook(() => useDrops({ mode: 'shopify', products: [], onLaunch }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(62_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.drops).toHaveLength(1);
    expect(onLaunch).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    await waitFor(() => expect(result.current.drops[0].state).toBe('en-la-calle'));
    expect(onLaunch).toHaveBeenCalled();
    expect(result.current.error).toBe('');
  });

  it('tras el lanzamiento vuelve a pedir el catálogo varias veces: Shopify tarda en servirlo', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => respond(payload('anunciado')))
      .mockImplementation(() => respond(payload('en-la-calle', SERVER_NOW + 61_000)));
    const onLaunch = vi.fn();
    const { result } = renderHook(() => useDrops({ mode: 'shopify', products: [], onLaunch }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(62_000);
    });
    expect(onLaunch).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(40_000);
    });
    expect(onLaunch).toHaveBeenCalledTimes(4);
  });

  it('al llegar el cierre de un drop a la venta vuelve a pedir drops y catálogo', async () => {
    const ENDS = new Date(SERVER_NOW + 60_000).toISOString();
    const live = (state, now) => ({
      now: new Date(now).toISOString(),
      featured: null,
      drops: [
        { ...payload(state).drops[0], state, launchAt: '2026-11-01T20:00:00+01:00', endsAt: ENDS },
      ],
    });
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => respond(live('ultimas-horas', SERVER_NOW)))
      .mockImplementation(() => respond(live('archivo', SERVER_NOW + 61_000)));
    const onLaunch = vi.fn();
    const { result } = renderHook(() => useDrops({ mode: 'shopify', products: [], onLaunch }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(62_000);
    });
    await waitFor(() => expect(result.current.drops[0].state).toBe('archivo'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onLaunch).toHaveBeenCalled();
  });

  it('si la tienda no responde (unavailable) no se inventa drops de demostración', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const products = [{ handle: 'rocky-35-red', dropHandle: 'rocky-drop-4' }];
    const { result } = renderHook(() => useDrops({ mode: 'unavailable', products }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.drops).toEqual([]);
    expect(result.current.featured).toBe(null);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mientras se comprueba el modo de la tienda no pide nada', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useDrops({ mode: 'checking', products: [] }));
    expect(result.current.loading).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/* La crew celebra la caída (vida-a-la-vista): onFall avisa una sola vez cuando
   un drop anunciado sale a la venta y el servidor lo confirma. Ni los repasos
   del catálogo ni el cierre de un drop lo llaman. */
describe('useDrops: aviso de caída', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(SERVER_NOW + 10 * 60_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const avanzar = (ms) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });

  it('al caer un drop anunciado y confirmarlo el servidor, avisa una vez; los repasos no repiten', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => respond(payload('anunciado')))
      .mockImplementation(() => respond(payload('en-la-calle', SERVER_NOW + 61_000)));
    const onFall = vi.fn();
    const onLaunch = vi.fn();
    const { result } = renderHook(() =>
      useDrops({ mode: 'shopify', products: [], onLaunch, onFall })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(onFall).not.toHaveBeenCalled();

    await avanzar(62_000);
    expect(onFall).toHaveBeenCalledTimes(1);

    await avanzar(40_000);
    expect(onLaunch).toHaveBeenCalledTimes(4);
    expect(onFall).toHaveBeenCalledTimes(1);
  });

  it('el cierre de un drop a la venta recarga, pero no avisa de ninguna caída', async () => {
    const ENDS = new Date(SERVER_NOW + 60_000).toISOString();
    const live = (state, now) => ({
      now: new Date(now).toISOString(),
      featured: null,
      drops: [
        { ...payload(state).drops[0], state, launchAt: '2026-11-01T20:00:00+01:00', endsAt: ENDS },
      ],
    });
    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => respond(live('ultimas-horas', SERVER_NOW)))
      .mockImplementation(() => respond(live('archivo', SERVER_NOW + 61_000)));
    const onFall = vi.fn();
    const onLaunch = vi.fn();
    const { result } = renderHook(() =>
      useDrops({ mode: 'shopify', products: [], onLaunch, onFall })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await avanzar(62_000);
    await waitFor(() => expect(result.current.drops[0].state).toBe('archivo'));
    expect(onLaunch).toHaveBeenCalled();
    expect(onFall).not.toHaveBeenCalled();
  });

  it('si el drop anunciado se aplaza, recarga como siempre pero no avisa de una caída que no ha habido', async () => {
    const LATER = '2026-11-14T20:00:00+01:00';
    const aplazado = {
      ...payload('anunciado', SERVER_NOW + 61_000),
      drops: [{ ...payload('anunciado').drops[0], launchAt: LATER }],
    };
    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => respond(payload('anunciado')))
      .mockImplementation(() => respond(aplazado));
    const onFall = vi.fn();
    const onLaunch = vi.fn();
    const { result } = renderHook(() =>
      useDrops({ mode: 'shopify', products: [], onLaunch, onFall })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await avanzar(62_000);
    await waitFor(() => expect(result.current.drops[0].launchAt).toBe(LATER));
    expect(onLaunch).toHaveBeenCalled();
    expect(onFall).not.toHaveBeenCalled();
  });

  it('si el drop anunciado se retira, tampoco avisa de ninguna caída', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => respond(payload('anunciado')))
      .mockImplementation(() =>
        respond({
          now: new Date(SERVER_NOW + 61_000).toISOString(),
          featured: null,
          drops: [],
        })
      );
    const onFall = vi.fn();
    const onLaunch = vi.fn();
    const { result } = renderHook(() =>
      useDrops({ mode: 'shopify', products: [], onLaunch, onFall })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await avanzar(62_000);
    await waitFor(() => expect(result.current.drops).toEqual([]));
    expect(onLaunch).toHaveBeenCalled();
    expect(onFall).not.toHaveBeenCalled();
  });

  it('si el servidor tarda, avisa una sola vez, cuando por fin confirma la caída', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => respond(payload('anunciado')))
      .mockImplementationOnce(() => respond(payload('anunciado', SERVER_NOW + 61_000)))
      .mockImplementationOnce(() => respond(payload('anunciado', SERVER_NOW + 66_000)))
      .mockImplementation(() => respond(payload('en-la-calle', SERVER_NOW + 81_000)));
    const onFall = vi.fn();
    const { result } = renderHook(() => useDrops({ mode: 'shopify', products: [], onFall }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await avanzar(62_000);
    await avanzar(5_000);
    expect(onFall).not.toHaveBeenCalled();

    await avanzar(15_000);
    await waitFor(() => expect(result.current.drops[0].state).toBe('en-la-calle'));
    expect(onFall).toHaveBeenCalledTimes(1);

    await avanzar(60_000);
    expect(onFall).toHaveBeenCalledTimes(1);
  });
});
