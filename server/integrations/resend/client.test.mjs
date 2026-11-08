import { describe, expect, it, vi } from 'vitest';
import { RESEND_BATCH_MAX, ResendError, createResendClient } from './client.mjs';

function mensaje(to = 'a@b.cd') {
  return { from: 'x@y.zz', to: [to], subject: 'Hola', text: 'Cuerpo' };
}

function respuesta(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('createResendClient', () => {
  it('exige la clave', () => {
    expect(() => createResendClient({ apiKey: '' })).toThrow(/RESEND_API_KEY/);
  });

  it('manda el lote a /emails/batch con la clave y la idempotencia', async () => {
    const fetchImpl = vi.fn(async () => respuesta(200, { data: [{ id: 'id-1' }, { id: 'id-2' }] }));
    const client = createResendClient({ apiKey: 're_test', fetchImpl });

    const result = await client.sendBatch([mensaje('a@b.cd'), mensaje('c@d.ef')], {
      idempotencyKey: 'avisos-123',
    });

    expect(result).toEqual({ ids: ['id-1', 'id-2'] });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails/batch');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer re_test');
    expect(options.headers['Idempotency-Key']).toBe('avisos-123');
    expect(JSON.parse(options.body)).toHaveLength(2);
  });

  it('rechaza lotes vacíos, demasiado grandes o con correos incompletos sin llamar', async () => {
    const fetchImpl = vi.fn();
    const client = createResendClient({ apiKey: 're_test', fetchImpl });

    await expect(client.sendBatch([])).rejects.toMatchObject({ code: 'EMPTY_BATCH' });
    await expect(
      client.sendBatch(Array.from({ length: RESEND_BATCH_MAX + 1 }, () => mensaje()))
    ).rejects.toMatchObject({ code: 'BATCH_TOO_LARGE' });
    await expect(client.sendBatch([{ from: 'x@y.zz', to: [] }])).rejects.toMatchObject({
      code: 'INVALID_MESSAGE',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('traduce un rechazo de Resend a ResendError con su código', async () => {
    const fetchImpl = vi.fn(async () =>
      respuesta(422, { name: 'validation_error', message: 'Dominio sin verificar' })
    );
    const client = createResendClient({ apiKey: 're_test', fetchImpl });

    await expect(client.sendBatch([mensaje()])).rejects.toMatchObject({
      name: 'ResendError',
      status: 502,
      code: 'validation_error',
      message: 'Dominio sin verificar',
    });
  });

  it('marca como 401 una clave rechazada', async () => {
    const fetchImpl = vi.fn(async () => respuesta(401, { name: 'missing_api_key' }));
    const client = createResendClient({ apiKey: 're_test', fetchImpl });
    await expect(client.sendBatch([mensaje()])).rejects.toMatchObject({ status: 401 });
  });

  it('envuelve los fallos de red', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const client = createResendClient({ apiKey: 're_test', fetchImpl });
    const error = await client.sendBatch([mensaje()]).catch((e) => e);
    expect(error).toBeInstanceOf(ResendError);
    expect(error.code).toBe('NETWORK_ERROR');
  });
});
