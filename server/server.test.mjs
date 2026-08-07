import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../server.mjs';

const runningServers = new Set();

afterEach(async () => {
  await Promise.all(
    [...runningServers].map(
      (server) => new Promise((resolve) => server.close(resolve))
    )
  );
  runningServers.clear();
});

async function startTestServer(options = {}) {
  const app = createApp({
    env: {
      NODE_ENV: 'test',
      PUBLIC_ORIGIN: 'https://rocky.test',
      OPENROUTER_API_KEY: 'test-key',
      CHAT_RATE_LIMIT_MAX: '2',
      ...options.env,
    },
    fetchImpl: options.fetchImpl,
    logger: options.logger ?? { error: vi.fn(), info: vi.fn() },
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  runningServers.add(server);
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

describe('HTTP security boundary', () => {
  it('adds security headers without exposing Express', async () => {
    const baseUrl = await startTestServer();

    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-powered-by')).toBeNull();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(response.headers.get('content-security-policy')).toContain(
      "frame-src 'self' https://open.spotify.com"
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects arbitrary browser origins before an upstream call', async () => {
    const fetchImpl = vi.fn();
    const baseUrl = await startTestServer({ fetchImpl });

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hola' }] }),
    });

    expect(response.status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns only the assistant message for a valid same-origin chat request', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'provider-secret-id',
          choices: [{ message: { content: 'Qué pasa, bro.' } }],
          usage: { prompt_tokens: 123 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const baseUrl = await startTestServer({ fetchImpl });

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://rocky.test',
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hola' }] }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: 'Qué pasa, bro.' });
  });

  it('bounds chat requests and removes the legacy proxy route', async () => {
    const fetchImpl = vi.fn();
    const baseUrl = await startTestServer({ fetchImpl });

    const malformed = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://rocky.test',
      },
      body: JSON.stringify({ messages: 'not-an-array' }),
    });
    const legacy = await fetch(`${baseUrl}/api/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://rocky.test',
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hola' }] }),
    });

    expect(malformed.status).toBe(400);
    expect(legacy.status).toBe(404);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects malformed and oversized JSON without leaking parser details', async () => {
    const baseUrl = await startTestServer();
    const headers = {
      'Content-Type': 'application/json',
      Origin: 'https://rocky.test',
    };

    const malformed = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: '{"messages":',
    });
    const oversized = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(20_000) }] }),
    });

    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ message: 'JSON no válido.' });
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual({ message: 'Petición demasiado grande.' });
  });

  it('rate-limits repeated direct calls even when CORS is not involved', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const baseUrl = await startTestServer({
      fetchImpl,
      env: { CHAT_RATE_LIMIT_MAX: '1' },
    });
    const request = () =>
      fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://rocky.test',
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hola' }] }),
      });

    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(429);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('preserves safe domain error status and code without exposing upstream details', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: 'sensitive upstream detail' }] }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const baseUrl = await startTestServer({
      fetchImpl,
      env: { SHOPIFY_STORE_DOMAIN: 'rocky-dev.myshopify.com' },
    });

    const response = await fetch(`${baseUrl}/api/shopify/products`);

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      message: 'Shopify no ha aceptado la petición.',
      code: 'THROTTLED',
    });
  });
});
