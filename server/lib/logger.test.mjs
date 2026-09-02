import { describe, expect, it, vi } from 'vitest';
import { createLogger, ensureLogger, silentLogger } from './logger.mjs';

describe('createLogger', () => {
  it('writes one JSON line per event with time, level, message and fields', () => {
    const stream = { write: vi.fn() };
    const logger = createLogger({
      stream,
      clock: () => new Date('2026-09-02T10:00:00.000Z'),
      base: { service: 'rocky035' },
    });

    logger.info('Servidor arrancado', { port: 3001 });
    logger.error('Falla', { requestId: 'req-1' });

    expect(stream.write).toHaveBeenCalledTimes(2);
    expect(JSON.parse(stream.write.mock.calls[0][0])).toEqual({
      time: '2026-09-02T10:00:00.000Z',
      level: 'info',
      message: 'Servidor arrancado',
      service: 'rocky035',
      port: 3001,
    });
    expect(stream.write.mock.calls[0][0].endsWith('\n')).toBe(true);
    expect(JSON.parse(stream.write.mock.calls[1][0])).toMatchObject({
      level: 'error',
      message: 'Falla',
      requestId: 'req-1',
    });
  });

  it('drops events below the configured level', () => {
    const stream = { write: vi.fn() };
    const logger = createLogger({ stream, level: 'warn' });

    logger.info('ruido');
    logger.warn('aviso');

    expect(stream.write).toHaveBeenCalledTimes(1);
    expect(JSON.parse(stream.write.mock.calls[0][0]).level).toBe('warn');
  });
});

describe('ensureLogger', () => {
  it('returns a complete logger untouched', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    expect(ensureLogger(logger)).toBe(logger);
  });

  it('fills missing levels with the nearest lower level without touching the others', () => {
    const partial = { info: vi.fn(), error: vi.fn() };
    const logger = ensureLogger(partial);

    logger.warn('aviso', { a: 1 });
    logger.error('falla');

    expect(partial.info).toHaveBeenCalledWith('aviso', { a: 1 });
    expect(partial.error).toHaveBeenCalledWith('falla');
  });

  it('stays silent when nothing is injected', () => {
    const logger = ensureLogger(null);

    expect(logger).toBe(silentLogger);
    expect(() => logger.error('nada', { a: 1 })).not.toThrow();
  });
});
