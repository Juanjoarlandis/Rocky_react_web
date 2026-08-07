import { describe, expect, it } from 'vitest';
import { formatPrice, parsePrice } from './price.js';

describe('price utilities', () => {
  it('formats Shopify Money values with their server-provided currency', () => {
    const formatted = formatPrice({ amount: '35.50', currencyCode: 'EUR' });
    expect(formatted.replace(/\s/g, ' ')).toBe('35,50 €');
  });

  it('keeps unknown preview prices out of calculations', () => {
    expect(parsePrice('??')).toBeNull();
    expect(formatPrice('??')).toBeNull();
  });
});
