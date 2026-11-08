import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../storage/memory-store.mjs';
import { silentLogger } from '../lib/logger.mjs';
import { AVISOS_INDICE, AVISOS_NAMESPACE, createAvisosService } from './avisos.mjs';

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
