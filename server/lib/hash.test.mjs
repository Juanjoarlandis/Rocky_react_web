import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Base64Url, sha256Hex } from './hash.mjs';

describe('hash helpers', () => {
  it('derives a stable base64url SHA-256 digest', () => {
    const expected = crypto.createHash('sha256').update('rocky', 'utf8').digest('base64url');

    expect(sha256Base64Url('rocky')).toBe(expected);
    expect(sha256Base64Url('rocky')).toBe(sha256Base64Url('rocky'));
    expect(sha256Base64Url('rocky')).not.toBe(sha256Base64Url('rocky '));
    expect(sha256Base64Url('rocky')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('hashes raw buffers to hexadecimal', () => {
    const body = Buffer.from('{"shop":"rocky-dev"}', 'utf8');

    expect(sha256Hex(body)).toBe(crypto.createHash('sha256').update(body).digest('hex'));
    expect(sha256Hex(body)).toMatch(/^[0-9a-f]{64}$/);
  });
});
