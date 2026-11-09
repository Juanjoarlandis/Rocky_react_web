import { describe, expect, it } from 'vitest';
import { clientKey } from './client-key.mjs';

describe('clave de cliente para contar intentos', () => {
  it('una IPv4, tal cual, también si llega mapeada en IPv6', () => {
    expect(clientKey('203.0.113.7')).toBe('203.0.113.7');
    expect(clientKey('::ffff:203.0.113.7')).toBe('203.0.113.7');
  });

  it('una IPv6 se agrupa por su /64', () => {
    expect(clientKey('2001:db8:1:2::1')).toBe('2001:0db8:0001:0002::/64');
    expect(clientKey('2001:DB8:1:2:ffff:1:2:3')).toBe('2001:0db8:0001:0002::/64');
    expect(clientKey('2001:db8::1')).toBe('2001:0db8:0000:0000::/64');
    expect(clientKey('::1')).toBe('0000:0000:0000:0000::/64');
    expect(clientKey('2001:db8:1:3::1')).not.toBe(clientKey('2001:db8:1:2::1'));
  });

  it('sin IP o con algo raro no rompe', () => {
    expect(clientKey(undefined)).toBe('unknown');
    expect(clientKey('')).toBe('unknown');
    expect(clientKey('no-es-ip')).toBe('no-es-ip');
  });
});
