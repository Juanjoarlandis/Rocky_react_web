import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.mjs';
import { encodePattern, emptyPattern } from '../../../shared/beat-codec.mjs';
import { MemoryStore } from '../../storage/memory-store.mjs';
import { BARRA_SYSTEM, describeBeat, parseVerses } from './barra.mjs';

const ORIGEN = 'https://rocky.test';
const running = new Set();

afterEach(async () => {
  await Promise.all([...running].map((server) => new Promise((resolve) => server.close(resolve))));
  running.clear();
});

function beatPattern() {
  const pattern = emptyPattern();
  [0, 6, 8].forEach((step) => (pattern[0][step] = 3));
  [4, 12].forEach((step) => (pattern[1][step] = 2));
  for (let step = 0; step < 16; step += 2) pattern[2][step] = 1;
  return pattern;
}

const BEAT = { code: encodePattern(beatPattern()), bpm: 92, swing: 0.2, tono: 're' };
const VERSOS = [
  'Bajo el foco violeta suena la colmena',
  'el bombo me empuja y la noche se llena',
  'la crew en la esquina, cabeceo sin prisa',
  'si vuelan las camis, que vuele la risa',
];

function openRouterReply(content, cost = 0, finishReason = 'stop') {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content }, finish_reason: finishReason }],
      usage: { cost },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

// Lo que devolvía nemotron con el razonamiento encendido: su plan en inglés.
const RAZONAMIENTO = [
  'The user wants a 4-line rap verse in Spanish (Spain style) following strict constraints:',
  '- Exactly 4 lines, one verse per line',
  '- Each line 6-12 words',
  '- Rhyme scheme: AABB (line 1 rhymes with 2, line 3 rhymes with 4)',
  'Line 1 (6-12 words, sets up rhyme A): "Noventa y dos, el bombo marca el paso"',
].join('\n');

async function arranca(fetchImpl, env = {}) {
  const app = createApp({
    env: {
      NODE_ENV: 'test',
      PUBLIC_ORIGIN: ORIGEN,
      OPENROUTER_API_KEY: 'test-key',
      CHAT_RATE_LIMIT_MAX: '20',
      CHAT_GLOBAL_DAILY_MAX: '50',
      ...env,
    },
    fetchImpl,
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    store: new MemoryStore(),
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  running.add(server);
  return `http://127.0.0.1:${server.address().port}`;
}

const pideBarra = (base, body = BEAT) =>
  fetch(`${base}/api/chat/barra`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGEN },
    body: JSON.stringify(body),
  });

describe('La barra de Rocky IA: el beat en palabras', () => {
  it('cuenta tempo, swing, tonalidad y lo que más suena', () => {
    const text = describeBeat({ pattern: beatPattern(), bpm: 92, swing: 0.2, tono: 're' });
    expect(text).toContain('92 BPM, tempo medio, de cabeceo, con un pelín de swing, en Re menor');
    expect(text).toContain('hi-hat (8 golpes)');
    expect(text).toContain('bombo (3 golpes, con acentos)');
  });

  it('se queda sólo con cuatro versos limpios', () => {
    expect(parseVerses(`1. «${VERSOS[0]}»\n- ${VERSOS[1]}\n\n${VERSOS[2]}\n${VERSOS[3]}`)).toEqual(
      VERSOS
    );
    expect(parseVerses(VERSOS.slice(0, 3).join('\n'))).toBeNull();
    expect(
      parseVerses([...VERSOS.slice(0, 3), 'y el hijo de puta que no me esperaba'].join('\n'))
    ).toBeNull();
  });

  it('no confunde el razonamiento del modelo con una barra', () => {
    expect(parseVerses(RAZONAMIENTO)).toBeNull();
    expect(parseVerses(`<think>${RAZONAMIENTO}</think>\n${VERSOS.join('\n')}`)).toEqual(VERSOS);
    expect(parseVerses(`<think>${RAZONAMIENTO}\n${VERSOS.join('\n')}`)).toBeNull();
  });

  it('se salta encabezados y quita las negritas', () => {
    expect(parseVerses(`**Tu barra:**\n**${VERSOS[0]}**\n${VERSOS.slice(1).join('\n')}`)).toEqual(
      VERSOS
    );
    expect(parseVerses(['(intro)', 'yeah', ...VERSOS].join('\n'))).toEqual(VERSOS);
  });
});

describe('/api/chat/barra', () => {
  it('pide la barra a un modelo gratuito y devuelve los cuatro versos', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(openRouterReply(VERSOS.join('\n')));
    const base = await arranca(fetchImpl);
    const response = await pideBarra(base);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ versos: VERSOS });

    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(sent.model).toMatch(/:free$/);
    expect(sent.provider).toEqual({ max_price: { prompt: 0, completion: 0 } });
    // Sin razonamiento: cuatro versos no necesitan pensar en voz alta.
    expect(sent.reasoning).toEqual({ enabled: false });
    expect(sent.max_tokens).toBeLessThanOrEqual(300);
    expect(sent.messages[0]).toEqual({ role: 'system', content: BARRA_SYSTEM });
    expect(sent.messages[1].content).toContain('Re menor');
  });

  it('si el modelo suelta algo impresentable, lo descarta y prueba otra vez', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(openRouterReply('no me sale nada'))
      .mockResolvedValueOnce(openRouterReply(VERSOS.join('\n')));
    const base = await arranca(fetchImpl);
    expect((await (await pideBarra(base)).json()).versos).toEqual(VERSOS);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('una respuesta cortada por el tope de tokens no se enseña', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(openRouterReply(VERSOS.join('\n'), 0, 'length'))
      .mockResolvedValueOnce(openRouterReply(VERSOS.join('\n')));
    const base = await arranca(fetchImpl);
    expect((await (await pideBarra(base)).json()).versos).toEqual(VERSOS);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('dos intentos malos: se ha quedado en blanco', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => openRouterReply('nada'));
    const base = await arranca(fetchImpl);
    const response = await pideBarra(base);
    expect(response.status).toBe(502);
    expect((await response.json()).message).toMatch(/en blanco/);
  });

  it('si alguien cobra, salta el cortacircuitos y se para también el chat', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation(async () => openRouterReply(VERSOS.join('\n'), 0.002));
    const base = await arranca(fetchImpl);
    expect((await pideBarra(base)).status).toBe(502);
    expect((await pideBarra(base)).status).toBe(503);
    const chat = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGEN },
      body: JSON.stringify({ message: 'hola' }),
    });
    expect(chat.status).toBe(503);
  });

  it('comparte el cupo diario con el chat', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => openRouterReply(VERSOS.join('\n')));
    const base = await arranca(fetchImpl, { CHAT_GLOBAL_DAILY_MAX: '1' });
    expect((await pideBarra(base)).status).toBe(200);
    const chat = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGEN },
      body: JSON.stringify({ message: 'hola' }),
    });
    expect(chat.status).toBe(429);
  });

  it('un beat vacío o sin el origen de la web no llega al modelo', async () => {
    const fetchImpl = vi.fn();
    const base = await arranca(fetchImpl);
    expect((await pideBarra(base, { ...BEAT, code: encodePattern(emptyPattern()) })).status).toBe(
      400
    );
    const sinOrigen = await fetch(`${base}/api/chat/barra`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://otra.web' },
      body: JSON.stringify(BEAT),
    });
    expect(sinOrigen.status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
