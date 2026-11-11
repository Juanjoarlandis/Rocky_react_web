import { describe, expect, it, vi } from 'vitest';
import { DROP_STATES } from '../../shared/drops.mjs';
import { createEsquina } from './esquina.mjs';

/* La esquina de la espera (esquina-de-la-espera): cuántos se han apuntado a un
   drop anunciado, en decenas hacia abajo, desde 10, sin sacar nada más de la
   lista. */
const D6 = { handle: 'rocky-drop-6', number: 6, state: DROP_STATES.ANNOUNCED, designCount: 2 };
const D5 = { handle: 'rocky-drop-5', number: 5, state: DROP_STATES.LIVE, designCount: 4 };
const payload = () => ({
  now: '2026-11-11T12:00:00.000Z',
  featured: { ...D6 },
  drops: [{ ...D6 }, { ...D5 }],
});
const emails = (n, prefix = 'a') =>
  Array.from({ length: n }, (_, i) => ({ email: `${prefix}${i}@x.test` }));

const SOURCES = [
  {
    handle: 'rocky-drop-6',
    products: [{ handle: 'rocky-el-jefe' }, { handle: 'rocky-en-las-nubes' }],
  },
  { handle: 'rocky-drop-5', products: [{ handle: 'rocky-ya-llego' }] },
  { handle: 'rocky-drop-7', products: [] },
];

function montar({ lists = {}, now = 0, list, sources = SOURCES } = {}) {
  const reloj = { now };
  const avisos = { list: list ?? vi.fn(async (key) => lists[key] ?? []) };
  const dropsModel = { sources: vi.fn(async () => sources) };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const esquina = createEsquina({ avisos, dropsModel, clock: () => reloj.now, logger });
  return { esquina, avisos, logger, reloj };
}

describe('la esquina de la espera', () => {
  it('143 apuntados se publican como 140, en los drops y en el destacado', async () => {
    const { esquina } = montar({
      lists: { 'rocky-drop-6': emails(100), 'rocky-el-jefe': emails(43, 'b') },
    });

    const decorado = await esquina.decorate(payload());

    expect(decorado.drops[0].waiting).toBe(140);
    expect(decorado.featured.waiting).toBe(140);
  });

  it('un email apuntado al drop y a un diseño cuenta una vez; los enviados no cuentan', async () => {
    const { esquina } = montar({
      lists: {
        'rocky-drop-6': [...emails(12), { email: 'enviado@x.test', enviado: '2026-11-10' }],
        'rocky-el-jefe': emails(12),
      },
    });

    expect((await esquina.decorate(payload())).drops[0].waiting).toBe(10);
  });

  it('con 9 no se manda nada: ni el campo', async () => {
    const { esquina } = montar({ lists: { 'rocky-drop-6': emails(9) } });

    const decorado = await esquina.decorate(payload());

    expect(decorado.drops[0]).not.toHaveProperty('waiting');
    expect(decorado.featured).not.toHaveProperty('waiting');
  });

  it('un drop a la venta no lleva el número, tenga los avisos que tenga', async () => {
    const { esquina } = montar({ lists: { 'rocky-drop-5': emails(200) } });

    expect((await esquina.decorate(payload())).drops[1]).not.toHaveProperty('waiting');
  });

  it('solo añade el número: ningún email en la respuesta y el payload de entrada intacto', async () => {
    const { esquina } = montar({ lists: { 'rocky-drop-6': emails(30) } });
    const entrada = payload();

    const decorado = await esquina.decorate(entrada);

    expect(JSON.stringify(decorado)).not.toContain('@');
    expect(decorado).toEqual({
      ...entrada,
      featured: { ...D6, waiting: 30 },
      drops: [{ ...D6, waiting: 30 }, D5],
    });
    expect(entrada.drops[0]).not.toHaveProperty('waiting');
  });

  it('cincuenta visitas a la vez leen la lista una sola vez', async () => {
    const { esquina, avisos } = montar({ lists: { 'rocky-drop-6': emails(30) } });

    await Promise.all(Array.from({ length: 50 }, () => esquina.decorate(payload())));

    expect(avisos.list.mock.calls.filter(([key]) => key === 'rocky-drop-6')).toHaveLength(1);
  });

  it('pasado el minuto vuelve a contar y ve a los nuevos', async () => {
    const lists = { 'rocky-drop-6': emails(30) };
    const { esquina, reloj } = montar({ lists });
    expect((await esquina.decorate(payload())).drops[0].waiting).toBe(30);

    lists['rocky-drop-6'] = emails(52);
    reloj.now += 30_000;
    expect((await esquina.decorate(payload())).drops[0].waiting).toBe(30);

    reloj.now += 31_000;
    expect((await esquina.decorate(payload())).drops[0].waiting).toBe(50);
  });

  it('si la lista falla, los drops salen igual y el registro solo lleva un código', async () => {
    const list = vi.fn(async () => {
      const error = new Error('roto a@x.test');
      error.code = 'STORE_LOCKED';
      throw error;
    });
    const { esquina, logger } = montar({ list });
    const entrada = payload();

    expect(await esquina.decorate(entrada)).toEqual(entrada);
    expect(logger.warn).toHaveBeenCalledWith('Esquina sin cuenta', { reason: 'STORE_LOCKED' });
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('@');
  });

  it('sin drops anunciados no toca la lista', async () => {
    const { esquina, avisos } = montar();
    const sinAnunciado = { now: 'x', featured: null, drops: [{ ...D5 }] };

    expect(await esquina.decorate(sinAnunciado)).toEqual(sinAnunciado);
    expect(avisos.list).not.toHaveBeenCalled();
  });

  // Revisión de Fable: el fallo de un drop no puede borrar el número de otro.
  it('si falla la cuenta de un drop, los demás anunciados conservan su número', async () => {
    const D7 = { ...D6, handle: 'rocky-drop-7', number: 7 };
    const list = vi.fn(async (key) => {
      if (key === 'rocky-drop-7') throw Object.assign(new Error('roto'), { code: 'STORE_LOCKED' });
      return key === 'rocky-drop-6' ? emails(30) : [];
    });
    const { esquina } = montar({ list });

    const decorado = await esquina.decorate({
      now: 'x',
      featured: { ...D6 },
      drops: [{ ...D6 }, { ...D7 }],
    });

    expect(decorado.drops[0].waiting).toBe(30);
    expect(decorado.drops[1]).not.toHaveProperty('waiting');
  });

  it('con el almacén fallando no relee en cada visita ni llena el registro: espera unos segundos', async () => {
    const list = vi.fn(async () => {
      throw Object.assign(new Error('roto'), { code: 'STORE_LOCKED' });
    });
    const { esquina, logger, reloj } = montar({ list });

    for (let i = 0; i < 5; i += 1) await esquina.decorate(payload());
    expect(list).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);

    reloj.now += 11_000;
    await esquina.decorate(payload());
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('un anunciado que no aparece en las fuentes no publica un número a la baja', async () => {
    const { esquina, avisos } = montar({
      lists: { 'rocky-drop-6': emails(30) },
      sources: [],
    });

    expect((await esquina.decorate(payload())).drops[0]).not.toHaveProperty('waiting');
    expect(avisos.list).not.toHaveBeenCalled();
  });
});
