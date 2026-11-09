import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../errors.mjs';
import { errorHandler } from '../middleware/error-handler.mjs';
import { requireTrustedOrigin } from '../middleware/origin-policy.mjs';
import { createTallerRouter } from './taller.mjs';

const ORIGIN = 'https://rocky.test';
const running = new Set();
afterEach(async () => {
  await Promise.all([...running].map((server) => new Promise((resolve) => server.close(resolve))));
  running.clear();
});

function fakeTaller({ loggedIn = true } = {}) {
  const service = {
    listDrops: vi.fn(async () => [{ handle: 'rocky-drop-7' }]),
    createDrop: vi.fn(async () => ({ handle: 'rocky-drop-7' })),
    updateDrop: vi.fn(async (handle) => ({ handle })),
    schedule: vi.fn(async (handle) => ({ handle })),
    unschedule: vi.fn(async (handle) => ({ handle })),
    createDesign: vi.fn(async () => ({ id: 'gid://shopify/Product/1' })),
    updateDesign: vi.fn(async (id) => ({ id })),
    addExistingDesign: vi.fn(async (handle) => ({ handle })),
    removeDesign: vi.fn(async (handle) => ({ handle })),
    searchProducts: vi.fn(async () => []),
    uploadImage: vi.fn(async () => ({
      fileId: 'gid://shopify/MediaImage/1',
      url: 'https://cdn.shopify.com/x.png',
    })),
  };
  const auth = {
    login: vi.fn(async () => ({ active: true, expiresAt: '2026-11-10T20:00:00.000Z' })),
    status: vi.fn(async () => ({ active: loggedIn, expiresAt: null })),
    logout: vi.fn(async () => {}),
    requireTaller: vi.fn((req, res, next) =>
      loggedIn
        ? next()
        : next(
            new HttpError('Entra en el Taller para seguir.', {
              status: 401,
              code: 'TALLER_AUTH_REQUIRED',
            })
          )
    ),
  };
  return { service, auth };
}

async function start(taller) {
  const app = express();
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  app.use(express.json({ limit: '16kb' }));
  app.use(
    '/api/taller',
    createTallerRouter({
      taller,
      requireOrigin: requireTrustedOrigin({ allowedOrigins: new Set([ORIGIN]) }),
      logger,
    })
  );
  app.use(errorHandler({ logger }));
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  running.add(server);
  return { base: `http://127.0.0.1:${server.address().port}/api/taller`, logger };
}

const send = (url, method, body, { origin = ORIGIN, type = 'application/json' } = {}) =>
  fetch(url, {
    method,
    headers: { 'Content-Type': type, ...(origin ? { Origin: origin } : {}) },
    body: type === 'application/json' ? JSON.stringify(body) : body,
  });

describe('/api/taller apagado', () => {
  it('responde 404 en todo', async () => {
    const { base } = await start(null);
    for (const [path, method] of [
      ['/session', 'GET'],
      ['/session', 'POST'],
      ['/drops', 'GET'],
    ]) {
      const response = await fetch(`${base}${path}`, { method });
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ code: 'TALLER_DISABLED' });
    }
  });
});

describe('/api/taller/session', () => {
  it('entra con origen exacto, sin caché', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    const response = await send(`${base}/session`, 'POST', { password: 'clave', code: '123456' });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(taller.auth.login).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      password: 'clave',
      code: '123456',
    });
  });

  it('sin origen o con otro no comprueba nada', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    expect(
      (await send(`${base}/session`, 'POST', { password: 'x', code: '1' }, { origin: null })).status
    ).toBe(403);
    expect(
      (
        await send(
          `${base}/session`,
          'POST',
          { password: 'x', code: '1' },
          { origin: 'https://otra.test' }
        )
      ).status
    ).toBe(403);
    expect(taller.auth.login).not.toHaveBeenCalled();
  });

  it('una entrada sin clave es un 400 de validación', async () => {
    const { base } = await start(fakeTaller());
    const response = await send(`${base}/session`, 'POST', { code: '123456' });
    expect(response.status).toBe(400);
  });

  it('dice si hay sesión y sale', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    expect(await (await fetch(`${base}/session`)).json()).toEqual({
      active: true,
      expiresAt: null,
    });
    expect((await send(`${base}/session`, 'DELETE')).status).toBe(204);
    expect(taller.auth.logout).toHaveBeenCalled();
  });
});

describe('/api/taller con y sin permiso', () => {
  it('sin permiso responde 401 y no toca el servicio', async () => {
    const taller = fakeTaller({ loggedIn: false });
    const { base } = await start(taller);
    const response = await fetch(`${base}/drops`);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'TALLER_AUTH_REQUIRED' });
    expect(taller.service.listDrops).not.toHaveBeenCalled();
  });

  it('con permiso lista drops sin exigir Origin en la lectura', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    const response = await fetch(`${base}/drops`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ drops: [{ handle: 'rocky-drop-7' }] });
  });

  it('las mutaciones exigen el Origin exacto', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    const response = await send(
      `${base}/drops`,
      'POST',
      { title: 'D7', number: 7, slug: '7' },
      { origin: null }
    );
    expect(response.status).toBe(403);
    expect(taller.service.createDrop).not.toHaveBeenCalled();
  });
});

describe('/api/taller/drops', () => {
  it('crea un drop con cuerpo validado', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    const response = await send(`${base}/drops`, 'POST', {
      title: ' ROCKY DROP 7 ',
      number: 7,
      slug: '7',
      extra: 1,
    });
    expect(response.status).toBe(201);
    expect(taller.service.createDrop).toHaveBeenCalledWith({
      title: 'ROCKY DROP 7',
      number: 7,
      slug: '7',
    });
    const bad = await send(`${base}/drops`, 'POST', {
      title: 'x'.repeat(81),
      number: 7,
      slug: '7',
    });
    expect(bad.status).toBe(400);
  });

  it('edita distinguiendo «no tocar» de «borrar» la fecha de cierre', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    await send(`${base}/drops/rocky-drop-7`, 'PATCH', { tagline: '', endsAt: null });
    expect(taller.service.updateDrop).toHaveBeenCalledWith('rocky-drop-7', {
      tagline: '',
      endsAt: null,
    });
    await send(`${base}/drops/rocky-drop-7`, 'PATCH', { launchAt: '2026-11-13T20:00:00+01:00' });
    expect(taller.service.updateDrop).toHaveBeenLastCalledWith('rocky-drop-7', {
      launchAt: '2026-11-13T20:00:00+01:00',
    });
  });

  it('el cartel solo puede venir del CDN de Shopify', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    const bad = await send(`${base}/drops/rocky-drop-7`, 'PATCH', {
      poster: { url: 'https://malo.test/cartel.png', alt: '' },
    });
    expect(bad.status).toBe(400);
    const good = await send(`${base}/drops/rocky-drop-7`, 'PATCH', {
      poster: { url: 'https://cdn.shopify.com/s/files/1/cartel.png?v=1', alt: 'Cartel' },
    });
    expect(good.status).toBe(200);
    const cleared = await send(`${base}/drops/rocky-drop-7`, 'PATCH', { poster: null });
    expect(cleared.status).toBe(200);
    expect(taller.service.updateDrop).toHaveBeenLastCalledWith('rocky-drop-7', { poster: null });
  });

  it('programa y despublica', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    expect((await send(`${base}/drops/rocky-drop-7/schedule`, 'POST', {})).status).toBe(200);
    expect((await send(`${base}/drops/rocky-drop-7/unschedule`, 'POST', {})).status).toBe(200);
    expect(taller.service.schedule).toHaveBeenCalledWith('rocky-drop-7');
    expect(taller.service.unschedule).toHaveBeenCalledWith('rocky-drop-7');
  });

  it('un fallo de una mutación queda en el log con su código y sin el cuerpo', async () => {
    const taller = fakeTaller();
    taller.service.schedule.mockRejectedValueOnce(
      new HttpError('Un drop sin diseños no se puede programar.', {
        status: 409,
        code: 'DROP_EMPTY',
      })
    );
    const { base, logger } = await start(taller);
    const response = await send(`${base}/drops/rocky-drop-7/schedule`, 'POST', {
      secreto: 'no-sale',
    });
    expect(response.status).toBe(409);
    expect(logger.warn).toHaveBeenCalledWith('Taller', {
      action: 'programar',
      target: 'rocky-drop-7',
      result: 'error',
      code: 'DROP_EMPTY',
    });
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('no-sale');
  });
});

describe('/api/taller diseños', () => {
  const DESIGN = {
    title: 'El Jefe',
    description: 'Aquí manda él.',
    price: '34.99',
    sizes: [
      { size: 'M', quantity: 3 },
      { size: 'L', quantity: null },
    ],
    fileId: 'gid://shopify/MediaImage/5',
  };

  it('crea un diseño completo', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    const response = await send(`${base}/drops/rocky-drop-7/designs`, 'POST', DESIGN);
    expect(response.status).toBe(201);
    expect(taller.service.createDesign).toHaveBeenCalledWith('rocky-drop-7', DESIGN);
  });

  it.each([
    ['precio cero', { price: '0' }],
    ['precio enorme', { price: '1000' }],
    ['precio raro', { price: '34,99' }],
    ['talla inventada', { sizes: [{ size: 'XXXL', quantity: 1 }] }],
    [
      'talla repetida',
      {
        sizes: [
          { size: 'M', quantity: 1 },
          { size: 'M', quantity: 2 },
        ],
      },
    ],
    ['sin tallas', { sizes: [] }],
    ['existencias negativas', { sizes: [{ size: 'M', quantity: -1 }] }],
    ['fichero que no es una imagen de Shopify', { fileId: 'gid://shopify/Product/1' }],
    ['descripción larga', { description: 'x'.repeat(1001) }],
  ])('rechaza %s con 400', async (_name, patch) => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    const response = await send(`${base}/drops/rocky-drop-7/designs`, 'POST', {
      ...DESIGN,
      ...patch,
    });
    expect(response.status).toBe(400);
    expect(taller.service.createDesign).not.toHaveBeenCalled();
  });

  it('edita, añade uno existente y lo quita por su id', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    const id = encodeURIComponent('gid://shopify/Product/42');
    expect((await send(`${base}/designs/${id}`, 'PATCH', { price: '39.99' })).status).toBe(200);
    expect(taller.service.updateDesign).toHaveBeenCalledWith('gid://shopify/Product/42', {
      price: '39.99',
    });
    expect(
      (
        await send(`${base}/drops/rocky-drop-7/designs/existing`, 'POST', {
          productId: 'gid://shopify/Product/42',
        })
      ).status
    ).toBe(200);
    expect((await send(`${base}/drops/rocky-drop-7/designs/${id}`, 'DELETE')).status).toBe(200);
    expect(taller.service.removeDesign).toHaveBeenCalledWith(
      'rocky-drop-7',
      'gid://shopify/Product/42'
    );
    expect(
      (await send(`${base}/designs/${encodeURIComponent('../../x')}`, 'PATCH', { price: '1' }))
        .status
    ).toBe(400);
  });

  it('busca productos con un término acotado', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    expect((await fetch(`${base}/products?q=jefe`)).status).toBe(200);
    expect(taller.service.searchProducts).toHaveBeenCalledWith('jefe');
    expect((await fetch(`${base}/products?q=${'x'.repeat(61)}`)).status).toBe(400);
  });
});

describe('/api/taller/images', () => {
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

  it('sube una imagen binaria', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    const response = await send(`${base}/images?alt=Cartel`, 'PUT', PNG, { type: 'image/png' });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      fileId: 'gid://shopify/MediaImage/1',
      url: 'https://cdn.shopify.com/x.png',
    });
    const call = taller.service.uploadImage.mock.calls[0][0];
    expect(Buffer.compare(call.buffer, PNG)).toBe(0);
    expect(call.alt).toBe('Cartel');
  });

  it('un tipo que no es de imagen es un 415', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    const response = await send(`${base}/images`, 'PUT', '<html></html>', { type: 'text/html' });
    expect(response.status).toBe(415);
    expect(taller.service.uploadImage).not.toHaveBeenCalled();
  });

  it('más de 8 MB es un 413', async () => {
    const taller = fakeTaller();
    const { base } = await start(taller);
    const big = Buffer.alloc(8 * 1024 * 1024 + 1, 0);
    PNG.copy(big);
    const response = await send(`${base}/images`, 'PUT', big, { type: 'image/png' });
    expect(response.status).toBe(413);
    expect(taller.service.uploadImage).not.toHaveBeenCalled();
  });
});
