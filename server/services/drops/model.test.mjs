import { describe, expect, it, vi } from 'vitest';
import { DROP_STATES } from '../../../shared/drops.mjs';
import { createDropsModel } from './model.mjs';

const config = (patch = {}) =>
  JSON.stringify({
    version: 1,
    number: 6,
    tagline: 'Cae dentro de poco',
    story: 'El próximo.',
    launchAt: '2026-11-13T20:00:00+01:00',
    endsAt: null,
    status: 'programado',
    ...patch,
  });

const product = (handle, availableForSale = true) => ({
  id: `gid://shopify/Product/${handle}`,
  handle,
  title: handle,
  availableForSale,
  variants: [],
});

function admin(drops) {
  return { listDrops: vi.fn(async () => drops) };
}

function logger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

const NOW = Date.parse('2026-11-10T12:00:00Z');

describe('modelo de drops', () => {
  it('sin Admin de Shopify no hay drops', async () => {
    const model = createDropsModel({ dropsAdmin: null });
    expect(await model.sources()).toEqual([]);
    expect((await model.publicPayload(new Date(NOW))).drops).toEqual([]);
  });

  it('lee las colecciones válidas y da la cara pública en el orden del muro', async () => {
    const model = createDropsModel({
      dropsAdmin: admin([
        {
          id: 'c5',
          handle: 'rocky-drop-5',
          title: 'ROCKY DROP 5',
          poster: null,
          rawConfig: config({ number: 5, launchAt: '2026-11-01T20:00:00+01:00' }),
          products: [product('rocky-sin-frenos')],
        },
        {
          id: 'c6',
          handle: 'rocky-drop-6',
          title: 'ROCKY DROP 6',
          poster: { url: 'https://cdn.shopify.com/6.png', alt: '' },
          rawConfig: config(),
          products: [product('rocky-el-jefe'), product('rocky-en-las-nubes')],
        },
        {
          id: 'c7',
          handle: 'rocky-drop-7',
          title: 'ROCKY DROP 7',
          poster: null,
          rawConfig: config({ number: 7, status: 'borrador', launchAt: null }),
          products: [],
        },
      ]),
      clock: () => NOW,
    });
    const payload = await model.publicPayload();
    expect(payload.now).toBe(new Date(NOW).toISOString());
    expect(payload.drops.map((d) => [d.handle, d.state])).toEqual([
      ['rocky-drop-6', DROP_STATES.ANNOUNCED],
      ['rocky-drop-5', DROP_STATES.LIVE],
    ]);
    expect(payload.featured.handle).toBe('rocky-drop-6');
    expect(JSON.stringify(payload)).not.toContain('el-jefe');
  });

  it('ignora un metacampo roto, lo registra sin su contenido y sigue con el resto', async () => {
    const log = logger();
    const model = createDropsModel({
      dropsAdmin: admin([
        {
          id: 'x',
          handle: 'rocky-drop-x',
          title: 'X',
          poster: null,
          rawConfig: '{"secreto":',
          products: [],
        },
        {
          id: 'c6',
          handle: 'rocky-drop-6',
          title: 'ROCKY DROP 6',
          poster: null,
          rawConfig: config(),
          products: [],
        },
        {
          id: 'y',
          handle: 'rocky-drop-y',
          title: 'Y',
          poster: null,
          rawConfig: null,
          products: [],
        },
      ]),
      clock: () => NOW,
      logger: log,
    });
    const sources = await model.sources();
    expect(sources.map((s) => s.handle)).toEqual(['rocky-drop-6']);
    expect(log.warn).toHaveBeenCalledWith(
      'Colección de drop con configuración no válida',
      expect.objectContaining({ handle: 'rocky-drop-x', field: 'config' })
    );
    expect(JSON.stringify(log.warn.mock.calls)).not.toContain('secreto');
  });

  it('un diseño en dos drops cuenta en el de lanzamiento más reciente', async () => {
    const log = logger();
    const model = createDropsModel({
      dropsAdmin: admin([
        {
          id: 'c5',
          handle: 'rocky-drop-5',
          title: 'D5',
          poster: null,
          rawConfig: config({ number: 5, launchAt: '2026-11-01T20:00:00+01:00' }),
          products: [product('rocky-doble'), product('rocky-solo-5')],
        },
        {
          id: 'c6',
          handle: 'rocky-drop-6',
          title: 'D6',
          poster: null,
          rawConfig: config(),
          products: [product('rocky-doble')],
        },
      ]),
      clock: () => NOW,
      logger: log,
    });
    const sources = await model.sources();
    expect(sources.find((s) => s.handle === 'rocky-drop-5').products.map((p) => p.handle)).toEqual([
      'rocky-solo-5',
    ]);
    expect(sources.find((s) => s.handle === 'rocky-drop-6').products.map((p) => p.handle)).toEqual([
      'rocky-doble',
    ]);
    expect(log.warn).toHaveBeenCalledWith(
      'Diseño en dos drops',
      expect.objectContaining({ product: 'rocky-doble', kept: 'rocky-drop-6' })
    );
  });

  it('cachea 30 s con una sola petición en vuelo e invalida a demanda', async () => {
    let now = NOW;
    const dropsAdmin = admin([]);
    const model = createDropsModel({ dropsAdmin, clock: () => now });
    await Promise.all([model.sources(), model.sources(), model.sources()]);
    expect(dropsAdmin.listDrops).toHaveBeenCalledTimes(1);
    now += 29_000;
    await model.sources();
    expect(dropsAdmin.listDrops).toHaveBeenCalledTimes(1);
    now += 2_000;
    await model.sources();
    expect(dropsAdmin.listDrops).toHaveBeenCalledTimes(2);
    model.invalidate();
    await model.sources();
    expect(dropsAdmin.listDrops).toHaveBeenCalledTimes(3);
  });

  it('si Shopify falla, sirve la última lectura buena sin caducar, aunque se haya invalidado', async () => {
    // El estado se calcula con la hora de cada consulta: una lectura vieja
    // sigue cerrando el drop a su hora y el guardián de la venta no se abre.
    let now = NOW;
    let fail = false;
    const log = logger();
    const dropsAdmin = {
      listDrops: vi.fn(async () => {
        if (fail) throw new Error('caído');
        return [
          {
            id: 'c6',
            handle: 'rocky-drop-6',
            title: 'D6',
            poster: null,
            rawConfig: config(),
            products: [],
          },
        ];
      }),
    };
    const model = createDropsModel({ dropsAdmin, clock: () => now, logger: log });
    expect(await model.sources()).toHaveLength(1);
    fail = true;
    now += 60_000;
    expect(await model.sources()).toHaveLength(1);
    now += 24 * 60 * 60_000;
    expect(await model.sources()).toHaveLength(1);
    model.invalidate();
    expect(await model.sources()).toHaveLength(1);
    expect(log.warn).toHaveBeenCalledWith(
      'Drops servidos de la última lectura buena',
      expect.any(Object)
    );
  });

  it('sin ninguna lectura buena y con Shopify caído, no hay drops y queda en el log', async () => {
    const log = logger();
    const model = createDropsModel({
      dropsAdmin: { listDrops: vi.fn(async () => Promise.reject(new Error('caído'))) },
      clock: () => NOW,
      logger: log,
    });
    expect(await model.sources()).toEqual([]);
    expect(log.error).toHaveBeenCalled();
  });

  it('una lectura que empezó antes de invalidar no se guarda como fresca', async () => {
    let release;
    let calls = 0;
    const drop = (handle) => ({
      id: handle,
      handle,
      title: handle,
      poster: null,
      rawConfig: config(),
      products: [],
    });
    const dropsAdmin = {
      listDrops: vi.fn(() => {
        calls += 1;
        if (calls === 1) {
          // La lectura pública vieja: tarda y no trae el drop nuevo.
          return new Promise((resolve) => {
            release = () => resolve([drop('rocky-drop-5')]);
          });
        }
        return Promise.resolve([drop('rocky-drop-5'), drop('rocky-drop-7')]);
      }),
    };
    const model = createDropsModel({ dropsAdmin, clock: () => NOW });
    const vieja = model.sources();
    model.invalidate(); // el Taller acaba de crear rocky-drop-7
    const tras = model.sources({ strict: true });
    release();
    expect((await vieja).map((s) => s.handle)).toEqual(['rocky-drop-5']);
    expect((await tras).map((s) => s.handle)).toEqual(['rocky-drop-5', 'rocky-drop-7']);
    expect((await model.sources()).map((s) => s.handle)).toEqual(['rocky-drop-5', 'rocky-drop-7']);
  });

  it('una colección rocky-drop-* sin metacampo no ensucia el log; uno roto sí', async () => {
    const log = logger();
    const model = createDropsModel({
      dropsAdmin: admin([
        {
          id: 'a',
          handle: 'rocky-drop-4',
          title: 'D4',
          poster: null,
          rawConfig: null,
          products: [],
        },
        {
          id: 'b',
          handle: 'rocky-drop-9',
          title: 'D9',
          poster: null,
          rawConfig: '{',
          products: [],
        },
      ]),
      clock: () => NOW,
      logger: log,
    });
    expect(await model.sources()).toEqual([]);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      'Colección de drop con configuración no válida',
      expect.objectContaining({ handle: 'rocky-drop-9' })
    );
  });

  it('en modo estricto (el Taller) el fallo de Shopify sube', async () => {
    const model = createDropsModel({
      dropsAdmin: { listDrops: vi.fn(async () => Promise.reject(new Error('caído'))) },
      clock: () => NOW,
    });
    await expect(model.sources({ strict: true })).rejects.toThrow('caído');
  });

  it('encuentra un drop público por su handle', async () => {
    const model = createDropsModel({
      dropsAdmin: admin([
        {
          id: 'c6',
          handle: 'rocky-drop-6',
          title: 'D6',
          poster: null,
          rawConfig: config(),
          products: [],
        },
      ]),
      clock: () => NOW,
    });
    expect((await model.publicDrop('rocky-drop-6')).state).toBe(DROP_STATES.ANNOUNCED);
    expect(await model.publicDrop('rocky-drop-9')).toBe(null);
  });
});
