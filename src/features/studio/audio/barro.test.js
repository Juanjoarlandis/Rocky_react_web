import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeAudioContext } from '../../../audio/fakeAudioContext.js';
import { BARRO_URL, cargarCortesBarro, olvidarBarro } from './barro.js';

const CORTES = [
  { id: 'a', label: 'Intro', inicio: 1, duracion: 0.5, tipo: 'aire' },
  { id: 'b', label: 'Golpe 1', inicio: 3, duracion: 0.25, tipo: 'medio' },
];

// El tema «decodificado»: 5 s estéreo con cada muestra igual a su posición en
// segundos, para comprobar que cada tramo sale del sitio correcto.
function contextoQueDecodifica() {
  const ctx = new FakeAudioContext();
  ctx.decodeAudioData = vi.fn(async () => {
    const buffer = ctx.createBuffer(2, 5 * ctx.sampleRate, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) data[i] = i / ctx.sampleRate;
    }
    return buffer;
  });
  return ctx;
}

const respuesta = () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) });

describe('los cortes de BARRO', () => {
  beforeEach(() => {
    olvidarBarro();
  });

  it('descarga el tema una sola vez por pestaña, aunque se carguen varias mesas', async () => {
    const fetchImpl = vi.fn(async () => respuesta());
    await cargarCortesBarro(contextoQueDecodifica(), { fetchImpl, cortes: CORTES });
    await cargarCortesBarro(contextoQueDecodifica(), { fetchImpl, cortes: CORTES });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(BARRO_URL);
  });

  it('cada corte sale del tramo correcto, con su duración y en estéreo', async () => {
    const ctx = contextoQueDecodifica();
    const tramos = await cargarCortesBarro(ctx, {
      fetchImpl: async () => respuesta(),
      cortes: CORTES,
    });
    const a = tramos.get('a');
    expect(a.numberOfChannels).toBe(2);
    expect(a.length).toBe(0.5 * ctx.sampleRate);
    expect(a.getChannelData(0)[0]).toBeCloseTo(1, 4);
    expect(tramos.get('b').getChannelData(1)[0]).toBeCloseTo(3, 4);
    expect([...tramos.keys()]).toEqual(['a', 'b']);
  });

  it('si la descarga falla, el error sube y el siguiente intento vuelve a descargar', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValue(respuesta());
    await expect(
      cargarCortesBarro(contextoQueDecodifica(), { fetchImpl, cortes: CORTES })
    ).rejects.toMatchObject({ code: 'BARRO_DESCARGA' });
    const tramos = await cargarCortesBarro(contextoQueDecodifica(), { fetchImpl, cortes: CORTES });
    expect(tramos.size).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('si no se puede decodificar, el error sube con su código y reintentar no vuelve a descargar', async () => {
    const fetchImpl = vi.fn(async () => respuesta());
    const roto = new FakeAudioContext();
    roto.decodeAudioData = vi.fn(async () => {
      throw new Error('formato no soportado');
    });
    await expect(cargarCortesBarro(roto, { fetchImpl, cortes: CORTES })).rejects.toMatchObject({
      message: 'formato no soportado',
      code: 'BARRO_DECODIFICAR',
    });
    const tramos = await cargarCortesBarro(contextoQueDecodifica(), { fetchImpl, cortes: CORTES });
    expect(tramos.size).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
