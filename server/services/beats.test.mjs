import { describe, expect, it } from 'vitest';
import { encodePattern, emptyPattern } from '../../shared/beat-codec.mjs';
import { MemoryStore } from '../storage/memory-store.mjs';
import {
  PUBLISH_PER_DAY,
  REPORTS_TO_HIDE,
  WEEK_MS,
  checkSubmission,
  createBeatsService,
} from './beats.mjs';

function code(seed = 1) {
  const pattern = emptyPattern();
  pattern[0][seed % 16] = 3;
  pattern[1][(seed * 3) % 16] = 2;
  return encodePattern(pattern);
}

function submission(overrides = {}) {
  return {
    code: code(),
    bpm: 92,
    swing: 0.2,
    tono: 'do',
    name: 'Barro nocturno',
    alias: 'asako',
    ...overrides,
  };
}

function service(now = { t: 1_800_000_000_000 }, options = {}) {
  return createBeatsService({ store: new MemoryStore(), clock: () => now.t, ...options });
}

describe('Comprobación de lo que se publica', () => {
  it('acepta un beat de la mesa y limpia los textos', () => {
    const { beat } = checkSubmission(submission({ name: '  Barro   nocturno ', swing: 0.2049 }));
    expect(beat).toMatchObject({ name: 'Barro nocturno', swing: 0.2, tono: 'do', bpm: 92 });
  });

  it('rechaza beats vacíos, fuera de rango o con nombres feos', () => {
    expect(checkSubmission(submission({ code: encodePattern(emptyPattern()) })).error).toMatch(
      /vacío/
    );
    expect(checkSubmission(submission({ bpm: 300 })).error).toMatch(/tempo/);
    expect(checkSubmission(submission({ swing: 0.9 })).error).toMatch(/swing/);
    expect(checkSubmission(submission({ tono: 'si' })).error).toMatch(/tonalidad/);
    expect(checkSubmission(submission({ code: 'ffffffffffffffff' })).error).toMatch(/mesa/);
    expect(checkSubmission(submission({ alias: 'x' })).error).toMatch(/apodo/);
    expect(checkSubmission(submission({ name: 'hijo de puta' })).error).toMatch(/no puede ir/);
  });
});

describe('El ranking de La Colmena', () => {
  it('publica, lista y no duplica el mismo beat', async () => {
    const beats = service();
    const { beat } = checkSubmission(submission());
    const created = await beats.publish(beat, 'votante-a');
    expect(created.status).toBe('created');
    expect(created.beat).toMatchObject({
      name: 'Barro nocturno',
      alias: 'asako',
      likes: 0,
      mine: true,
    });

    const again = await beats.publish(beat, 'votante-b');
    expect(again.status).toBe('duplicate');
    expect(again.beat.id).toBe(created.beat.id);

    const list = await beats.list({ order: 'nuevos', voterKey: 'votante-b' });
    expect(list).toHaveLength(1);
    expect(list[0].mine).toBe(false);
  });

  it('pone techo a lo que publica un mismo navegador en un día', async () => {
    const beats = service();
    for (let index = 0; index < PUBLISH_PER_DAY; index += 1) {
      const { beat } = checkSubmission(submission({ code: code(index + 1), bpm: 60 + index }));
      expect((await beats.publish(beat, 'votante-a')).status).toBe('created');
    }
    const { beat } = checkSubmission(submission({ code: code(99), bpm: 150 }));
    expect((await beats.publish(beat, 'votante-a')).status).toBe('limit');
    expect((await beats.publish(beat, 'votante-b')).status).toBe('created');
  });

  it('el like es un interruptor: uno por navegador', async () => {
    const beats = service();
    const { beat } = checkSubmission(submission());
    const { beat: created } = await beats.publish(beat, 'autor');
    expect(await beats.toggleLike(created.id, 'fan')).toEqual({ liked: true, likes: 1 });
    expect(await beats.toggleLike(created.id, 'fan')).toEqual({ liked: false, likes: 0 });
    await beats.toggleLike(created.id, 'fan');
    const [view] = await beats.list({ voterKey: 'fan' });
    expect(view).toMatchObject({ likes: 1, weekLikes: 1, liked: true });
    expect(await beats.toggleLike('noexiste123', 'fan')).toBeNull();
  });

  it('el top de la semana cuenta sólo los likes de los últimos siete días', async () => {
    const now = { t: 1_800_000_000_000 };
    const beats = service(now);
    const viejo = (await beats.publish(checkSubmission(submission({ code: code(1) })).beat, 'a'))
      .beat;
    const nuevo = (await beats.publish(checkSubmission(submission({ code: code(2) })).beat, 'b'))
      .beat;
    for (const fan of ['f1', 'f2', 'f3']) await beats.toggleLike(viejo.id, fan);
    now.t += WEEK_MS + 1_000;
    await beats.toggleLike(nuevo.id, 'f4');

    const semana = await beats.list({ order: 'semana' });
    expect(semana.map((beat) => beat.id)).toEqual([nuevo.id, viejo.id]);
    expect(semana[1]).toMatchObject({ likes: 3, weekLikes: 0 });
  });

  it('tres reportes de navegadores distintos lo ocultan', async () => {
    const beats = service();
    const { beat: created } = await beats.publish(checkSubmission(submission()).beat, 'autor');
    for (let index = 1; index < REPORTS_TO_HIDE; index += 1) {
      expect(await beats.report(created.id, `r${index}`)).toEqual({ hidden: false });
    }
    // El mismo navegador reportando dos veces no cuenta doble.
    expect(await beats.report(created.id, 'r1')).toEqual({ hidden: false });
    expect(await beats.report(created.id, 'r9')).toEqual({ hidden: true });
    expect(await beats.list()).toEqual([]);
  });

  it('lleno, se va primero lo oculto y luego lo viejo con pocos likes', async () => {
    const now = { t: 1_800_000_000_000 };
    const beats = service(now, { maxBeats: 3 });
    const ids = [];
    for (let index = 1; index <= 3; index += 1) {
      now.t += 1_000;
      const { beat } = await beats.publish(
        checkSubmission(submission({ code: code(index) })).beat,
        `autor${index}`
      );
      ids.push(beat.id);
    }
    for (const fan of ['f1', 'f2', 'f3']) await beats.toggleLike(ids[0], fan);
    now.t += 1_000;
    await beats.publish(checkSubmission(submission({ code: code(9) })).beat, 'autor9');
    const quedan = (await beats.list({ order: 'nuevos' })).map((beat) => beat.id);
    expect(quedan).toHaveLength(3);
    expect(quedan).toContain(ids[0]);
    expect(quedan).not.toContain(ids[1]);
  });

  it('se puede quitar un beat', async () => {
    const beats = service();
    const { beat: created } = await beats.publish(checkSubmission(submission()).beat, 'autor');
    expect(await beats.remove(created.id)).toBe(true);
    expect(await beats.remove(created.id)).toBe(false);
    expect(await beats.list()).toEqual([]);
  });
});

describe('clase de escritura de los beats', () => {
  function recording() {
    const store = new MemoryStore();
    const writes = [];
    for (const method of ['set', 'delete']) {
      const original = store[method].bind(store);
      store[method] = (...args) => {
        const options = method === 'set' ? args[3] : args[2];
        writes.push(`${method}:${options?.durability ?? 'confirmed'}`);
        return original(...args);
      };
    }
    const now = { t: 1_800_000_000_000 };
    return { beats: createBeatsService({ store, clock: () => now.t }), writes };
  }

  it('publicar y retirar un beat quedan escritos antes de responder', async () => {
    const { beats, writes } = recording();

    const published = await beats.publish(checkSubmission(submission()).beat, 'voter-1');
    await beats.remove(published.beat.id);

    expect(writes.length).toBeGreaterThanOrEqual(3);
    expect(new Set(writes)).toEqual(new Set(['set:confirmed', 'delete:confirmed']));
  });

  it('un «me mola» y un reporte no esperan al disco', async () => {
    const { beats, writes } = recording();
    const published = await beats.publish(checkSubmission(submission()).beat, 'voter-1');
    writes.length = 0;

    await beats.toggleLike(published.beat.id, 'voter-2');
    await beats.report(published.beat.id, 'voter-3');

    expect(writes).toEqual(['set:deferred', 'set:deferred']);
  });
});

describe('moderación de beats', () => {
  it('el reporte que oculta un beat queda escrito antes de responder', async () => {
    const store = new MemoryStore();
    const now = { t: 1_800_000_000_000 };
    const beats = createBeatsService({ store, clock: () => now.t });
    const published = await beats.publish(checkSubmission(submission()).beat, 'voter-1');
    const durabilities = [];
    const set = store.set.bind(store);
    store.set = (...args) => {
      durabilities.push(args[3]?.durability ?? 'confirmed');
      return set(...args);
    };

    const results = [];
    for (const voter of ['v2', 'v3', 'v4']) {
      results.push(await beats.report(published.beat.id, voter));
    }

    expect(results.at(-1)).toEqual({ hidden: true });
    expect(durabilities).toEqual(['deferred', 'deferred', 'confirmed']);
  });
});
