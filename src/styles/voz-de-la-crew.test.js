import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { rulesOf } from './cssRules.js';

/* La voz de la crew (voz-de-la-crew): el grito del muñeco vive en la ventana del
   «Añadido ✓». jsdom no pinta, así que se comprueba sobre la hoja. */
const detalle = fs.readFileSync(path.join(import.meta.dirname, 'pages/product-detail.css'), 'utf8');
const inside = (rule, pattern) => rule.ancestors.some((open) => pattern.test(open));

describe('el grito del muñeco al añadir', () => {
  const rules = rulesOf(detalle);

  it('de normal no se ve', () => {
    const base = rules.find((rule) => rule.prelude === '.detail-grito' && !inside(rule, /^@media/));

    expect(base.body).toMatch(/opacity:\s*0/);
    expect(base.body).toMatch(/pointer-events:\s*none/);
  });

  it('se ve solo mientras el botón dice «Añadido ✓»', () => {
    const visible = rules.filter(
      (rule) => /opacity:\s*1/.test(rule.body) && rule.prelude.includes('.detail-grito')
    );

    expect(visible.length).toBeGreaterThan(0);
    for (const rule of visible) {
      expect(rule.prelude).toMatch(/\.detail-grid:has\(\.btn--added\) \.detail-grito/);
    }
  });

  it('el salto solo va con movimiento sin reducir, una vez', () => {
    const salto = rules.find(
      (rule) =>
        rule.prelude.includes('.detail-grid:has(.btn--added) .detail-grito') &&
        /animation:\s*grito-salta\b/.test(rule.body)
    );

    expect(salto).toBeDefined();
    expect(inside(salto, /prefers-reduced-motion:\s*no-preference/)).toBe(true);
    expect(salto.body).not.toMatch(/infinite/);
    expect(detalle).toMatch(/@keyframes grito-salta\s*\{/);
  });
});
