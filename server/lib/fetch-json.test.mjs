import { describe, expect, it, vi } from 'vitest';
import { FetchJsonError, fetchJson, fetchWithTimeout } from './fetch-json.mjs';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchJson', () => {
  it('returns the response and its parsed body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 201));

    const { response, payload } = await fetchJson({ url: 'https://api.test', fetchImpl });

    expect(response.status).toBe(201);
    expect(payload).toEqual({ ok: true });
    expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('returns a null payload when the body is not JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('<html>', { status: 502 }));

    const { response, payload } = await fetchJson({ url: 'https://api.test', fetchImpl });

    expect(response.status).toBe(502);
    expect(payload).toBeNull();
  });

  it('maps an abort to TIMEOUT and any other failure to NETWORK_ERROR', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });

    await expect(
      fetchJson({ url: 'https://api.test', fetchImpl: vi.fn().mockRejectedValue(abort) })
    ).rejects.toMatchObject({ name: 'FetchJsonError', code: 'TIMEOUT' });
    await expect(
      fetchJson({
        url: 'https://api.test',
        fetchImpl: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      })
    ).rejects.toMatchObject({ name: 'FetchJsonError', code: 'NETWORK_ERROR' });
  });

  it('aborts a slow upstream when the timeout elapses', async () => {
    const fetchImpl = vi.fn(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        })
    );

    await expect(
      fetchJson({ url: 'https://api.test', fetchImpl, timeoutMs: 5 })
    ).rejects.toBeInstanceOf(FetchJsonError);
  });

  it('also aborts when the caller signal fires first', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        })
    );

    const pending = fetchWithTimeout({
      url: 'https://api.test',
      fetchImpl,
      timeoutMs: 10_000,
      signal: controller.signal,
    });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
