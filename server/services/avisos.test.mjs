import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../storage/memory-store.mjs';
import { silentLogger } from '../lib/logger.mjs';
import { AVISOS_INDICE, AVISOS_NAMESPACE, countPending, createAvisosService } from './avisos.mjs';

function servicio() {
  const store = new MemoryStore();
  let tick = 0;
  const avisos = createAvisosService({
    store,
    logger: silentLogger,
    clock: () => new Date(Date.UTC(2026, 8, 4, 12, 0, tick++)),
  });
  return { store, avisos };
}

describe('avisos: lista, envío y borrado', () => {
  it('lista productos y entradas, y las entradas nacen sin enviado', async () => {
    const { avisos } = servicio();
    await avisos.register({ product: '35-red', email: 'a@b.cd' });
    await avisos.register({ product: '35-red', email: 'c@d.ef' });
    await avisos.register({ product: 'otro', email: 'a@b.cd' });

    expect(await avisos.products()).toEqual(['35-red', 'otro']);
    const lista = await avisos.list('35-red');
    expect(lista.map((e) => e.email)).toEqual(['a@b.cd', 'c@d.ef']);
    expect(lista.every((e) => e.enviado === undefined)).toBe(true);
    expect(await avisos.list('no-existe')).toEqual([]);
  });

  it('markSent marca sólo los emails dados y no vuelve a marcar', async () => {
    const { avisos } = servicio();
    await avisos.register({ product: '35-red', email: 'a@b.cd' });
    await avisos.register({ product: '35-red', email: 'c@d.ef' });

    expect(await avisos.markSent('35-red', ['a@b.cd'], '2026-09-04T12:00:00.000Z')).toBe(1);
    expect(await avisos.markSent('35-red', ['a@b.cd'], '2026-09-04T13:00:00.000Z')).toBe(0);

    const lista = await avisos.list('35-red');
    expect(lista.find((e) => e.email === 'a@b.cd').enviado).toBe('2026-09-04T12:00:00.000Z');
    expect(lista.find((e) => e.email === 'c@d.ef').enviado).toBeUndefined();
  });

  it('clear borra la lista y saca el producto del índice', async () => {
    const { store, avisos } = servicio();
    await avisos.register({ product: '35-red', email: 'a@b.cd' });
    await avisos.register({ product: 'otro', email: 'a@b.cd' });

    expect(await avisos.clear('35-red')).toBe(true);
    expect(await avisos.clear('35-red')).toBe(false);
    expect(await store.get(AVISOS_NAMESPACE, '35-red')).toBeNull();
    expect(await store.get(AVISOS_NAMESPACE, AVISOS_INDICE)).toEqual(['otro']);
  });
});

describe('avisos: escritura confirmada', () => {
  it('un alta de aviso queda escrita antes de responder', async () => {
    const { store, avisos } = servicio();
    const durabilities = [];
    const set = store.set.bind(store);
    store.set = (...args) => {
      durabilities.push(args[3]?.durability ?? 'confirmed');
      return set(...args);
    };

    await avisos.register({ product: '35-red', email: 'a@b.cd' });

    expect(durabilities.length).toBeGreaterThan(0);
    expect(new Set(durabilities)).toEqual(new Set(['confirmed']));
  });
});

/* La esquina de la espera (esquina-de-la-espera): una sola regla para contar
   los avisos de un drop, la que usan El Taller y el cartel. */
describe('avisos: cuántos esperan', () => {
  it('cuenta emails distintos entre varias claves y no cuenta los ya enviados', async () => {
    const { avisos } = servicio();
    await avisos.register({ product: 'rocky-drop-7', email: 'a@x.test' });
    await avisos.register({ product: 'rocky-drop-7', email: 'b@x.test' });
    await avisos.register({ product: 'rocky-el-jefe', email: 'a@x.test' });
    await avisos.register({ product: 'rocky-el-jefe', email: 'c@x.test' });
    await avisos.markSent('rocky-drop-7', ['b@x.test']);

    expect(await countPending(avisos, ['rocky-drop-7', 'rocky-el-jefe'])).toBe(2);
  });

  it('una clave sin lista cuenta cero', async () => {
    const { avisos } = servicio();

    expect(await countPending(avisos, ['no-existe'])).toBe(0);
    expect(await countPending(avisos, [])).toBe(0);
  });

  it('solo necesita leer las listas: sirve con cualquier cosa que tenga list', async () => {
    const lists = { a: [{ email: 'x@y.test' }], b: [{ email: 'x@y.test' }, { email: 'z@y.test' }] };

    expect(await countPending({ list: async (key) => lists[key] ?? [] }, ['a', 'b'])).toBe(2);
  });
});
