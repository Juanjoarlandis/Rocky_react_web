import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestJson } from './http.js';
import { ChatError, sendChatMessage } from './chat.js';
import { subscribeDropNotice } from './avisos.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('cliente HTTP del BFF', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('manda JSON con cookies del mismo origen y pasa la señal de cancelación', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    await requestJson('/api/x', { method: 'POST', body: { a: 1 }, signal: controller.signal });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({ a: 1 }),
        signal: controller.signal,
      })
    );
  });

  it('convierte fallos de red y respuestas no ok en ApiError con status y código', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(requestJson('/api/x')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 503,
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ message: 'Origen no permitido.', code: 'ORIGIN' }, 403))
    );
    await expect(requestJson('/api/x')).rejects.toMatchObject({ status: 403, code: 'ORIGIN' });
  });

  it('deja pasar la cancelación tal cual', async () => {
    const abort = new DOMException('Cancelado', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(requestJson('/api/x')).rejects.toBe(abort);
  });
});

describe('Rocky IA', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('traduce el 403 y los 5xx a su propia voz y respeta los 4xx del BFF', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ message: 'Origen no permitido.' }, 403))
    );
    await expect(sendChatMessage('hola')).rejects.toMatchObject({
      userMessage: expect.stringContaining('tienda oficial'),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'peta' }, 502)));
    await expect(sendChatMessage('hola')).rejects.toMatchObject({
      userMessage: expect.stringContaining('sin señal'),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => jsonResponse({ message: 'Has hablado mucho.' }, 429))
    );
    await expect(sendChatMessage('hola')).rejects.toBeInstanceOf(ChatError);
    await expect(sendChatMessage('hola')).rejects.toMatchObject({
      userMessage: 'Has hablado mucho.',
    });
  });

  it('devuelve mensaje y productos, y avisa si la respuesta no trae mensaje', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ message: 'Ey', products: 'no' }))
    );
    await expect(sendChatMessage('hola')).resolves.toEqual({ message: 'Ey', products: [] });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({})));
    await expect(sendChatMessage('hola')).rejects.toMatchObject({
      userMessage: expect.stringContaining('no he entendido'),
    });
  });
});

describe('avisos de drop', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('unifica duplicate/repetido y usa el mensaje del servidor cuando lo hay', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, repetido: true })));
    await expect(
      subscribeDropNotice({ producto: 'x', email: 'a@b.c', consentimiento: true, apodo: '' })
    ).resolves.toEqual({ duplicate: true });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ message: 'Necesitamos tu permiso.' }, 400))
    );
    await expect(
      subscribeDropNotice({ producto: 'x', email: 'a@b.c', consentimiento: false, apodo: '' })
    ).rejects.toThrow('Necesitamos tu permiso.');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(
      subscribeDropNotice({ producto: 'x', email: 'a@b.c', consentimiento: true, apodo: '' })
    ).rejects.toThrow('No hemos podido apuntarte');
  });
});
