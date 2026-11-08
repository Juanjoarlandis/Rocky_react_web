import { describe, expect, it } from 'vitest';
import { createMailConfig, parseAddress } from './mail.mjs';

describe('parseAddress', () => {
  it('acepta un email a secas y lo normaliza', () => {
    expect(parseAddress('  Avisos@Rocky035.com ')).toEqual({
      name: '',
      email: 'avisos@rocky035.com',
      raw: 'Avisos@Rocky035.com',
    });
  });

  it('acepta "Nombre <email>"', () => {
    expect(parseAddress('El Recadero <avisos@rocky035.com>')).toEqual({
      name: 'El Recadero',
      email: 'avisos@rocky035.com',
      raw: 'El Recadero <avisos@rocky035.com>',
    });
  });

  it('rechaza lo que no es una dirección', () => {
    expect(parseAddress('')).toBeNull();
    expect(parseAddress('sin-arroba')).toBeNull();
    expect(parseAddress('Nombre <sin-arroba>')).toBeNull();
    expect(parseAddress('<a@b.c> extra')).toBeNull();
  });
});

describe('createMailConfig', () => {
  it('queda apagado sin clave o sin remitente', () => {
    expect(createMailConfig({}).enabled).toBe(false);
    expect(createMailConfig({ RESEND_API_KEY: 're_x' }).enabled).toBe(false);
    expect(createMailConfig({ AVISOS_FROM: 'a@b.cd' }).enabled).toBe(false);
  });

  it('se enciende con clave y remitente y acota el lote a 100', () => {
    const config = createMailConfig({
      RESEND_API_KEY: 're_x',
      AVISOS_FROM: 'El Recadero <avisos@rocky035.com>',
      AVISOS_REPLY_TO: 'hola@rocky035.com',
      AVISOS_BATCH_SIZE: '500',
    });
    expect(config.enabled).toBe(true);
    expect(config.from.email).toBe('avisos@rocky035.com');
    expect(config.replyTo.email).toBe('hola@rocky035.com');
    expect(config.batchSize).toBe(100);
  });

  it('falla en alto con un remitente mal escrito', () => {
    expect(() => createMailConfig({ AVISOS_FROM: 'mal' })).toThrow(/AVISOS_FROM/);
    expect(() => createMailConfig({ AVISOS_REPLY_TO: 'mal' })).toThrow(/AVISOS_REPLY_TO/);
  });
});
