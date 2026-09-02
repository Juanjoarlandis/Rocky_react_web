import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../server.mjs';
import { AVISOS_INDICE, AVISOS_NAMESPACE, celdaCsvSegura } from './avisos.mjs';
import { MemoryStore } from './encrypted-store.mjs';

const ORIGEN = 'https://rocky.test';
const runningServers = new Set();

afterEach(async () => {
  await Promise.all(
    [...runningServers].map((server) => new Promise((resolve) => server.close(resolve)))
  );
  runningServers.clear();
});

async function arrancaServidor(options = {}) {
  const store = new MemoryStore();
  const app = createApp({
    env: {
      NODE_ENV: 'test',
      PUBLIC_ORIGIN: ORIGEN,
      OPENROUTER_API_KEY: 'test-key',
      ...options.env,
    },
    logger: { error: vi.fn(), info: vi.fn() },
    store,
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  runningServers.add(server);
  const { port } = server.address();
  return { store, baseUrl: `http://127.0.0.1:${port}` };
}

function apunta(baseUrl, body, { origin = ORIGEN } = {}) {
  return fetch(`${baseUrl}/api/avisos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

const ALTA = {
  producto: 'signal-ghost',
  email: 'crew@rocky.test',
  consentimiento: true,
  apodo: '',
};

describe('exportación CSV de avisos', () => {
  it('neutraliza fórmulas y escapa comillas en datos controlados por el cliente', () => {
    expect(celdaCsvSegura('=HYPERLINK("https://malote.test")')).toBe(
      '"\'=HYPERLINK(""https://malote.test"")"'
    );
    expect(celdaCsvSegura('crew@rocky.test')).toBe('"crew@rocky.test"');
  });
});

describe('POST /api/avisos', () => {
  it('apunta el aviso y lo deja en el store con su índice', async () => {
    const { store, baseUrl } = await arrancaServidor();

    const respuesta = await apunta(baseUrl, ALTA);
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true, repetido: false });

    const lista = await store.get(AVISOS_NAMESPACE, 'signal-ghost');
    expect(lista).toHaveLength(1);
    expect(lista[0].email).toBe('crew@rocky.test');
    expect(lista[0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(await store.get(AVISOS_NAMESPACE, AVISOS_INDICE)).toEqual(['signal-ghost']);
  });

  it('no duplica un email repetido y lo dice', async () => {
    const { store, baseUrl } = await arrancaServidor();

    await apunta(baseUrl, ALTA);
    const repetida = await apunta(baseUrl, { ...ALTA, email: ' CREW@rocky.test ' });

    expect(await repetida.json()).toEqual({ ok: true, repetido: true });
    expect(await store.get(AVISOS_NAMESPACE, 'signal-ghost')).toHaveLength(1);
  });

  it('rechaza emails que no lo son y altas sin permiso', async () => {
    const { baseUrl } = await arrancaServidor();

    expect((await apunta(baseUrl, { ...ALTA, email: 'esto no es un email' })).status).toBe(400);
    expect((await apunta(baseUrl, { ...ALTA, consentimiento: false })).status).toBe(400);
    expect((await apunta(baseUrl, { ...ALTA, producto: '' })).status).toBe(400);
    // La clave del índice no es un producto.
    expect((await apunta(baseUrl, { ...ALTA, producto: AVISOS_INDICE })).status).toBe(400);
  });

  it('al bot que rellena el campo trampa se le sonríe y no se guarda nada', async () => {
    const { store, baseUrl } = await arrancaServidor();

    const respuesta = await apunta(baseUrl, { ...ALTA, apodo: 'Bot McBotface' });

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true, repetido: false });
    expect(await store.get(AVISOS_NAMESPACE, 'signal-ghost')).toBeNull();
  });

  it('sin origen de confianza no hay lista', async () => {
    const { baseUrl } = await arrancaServidor();

    expect((await apunta(baseUrl, ALTA, { origin: 'https://malote.test' })).status).toBe(403);
    expect((await apunta(baseUrl, ALTA, { origin: null })).status).toBe(403);
  });

  it('corta el grifo al pasarse del límite por ventana', async () => {
    const { baseUrl } = await arrancaServidor({
      env: { AVISOS_RATE_LIMIT_MAX: '2' },
    });

    await apunta(baseUrl, ALTA);
    await apunta(baseUrl, { ...ALTA, email: 'otro@rocky.test' });
    const tercera = await apunta(baseUrl, { ...ALTA, email: 'tercero@rocky.test' });

    expect(tercera.status).toBe(429);
  });
});
