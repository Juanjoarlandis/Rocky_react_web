import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const globalCss = readFileSync('src/index.css', 'utf8');
const studioCss = readFileSync('src/styles/Studio.css', 'utf8');
const cartRunnerCss = readFileSync('src/styles/CartRunner.css', 'utf8');

describe('reduced motion contract', () => {
  it('stops the global loading spinner without removing its status mark', () => {
    expect(globalCss).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.page-loading-spinner\s*\{[\s\S]*?animation:\s*none;/
    );
  });

  it('stops the Studio setlist spinner while keeping the active-track indicator', () => {
    expect(studioCss).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.setlist-spinner\s*\{[\s\S]*?animation:\s*none;/
    );
  });

  // Aquí el gesto es el recorrido: parado no cuenta nada y tapa la barra.
  it('keeps the cart runner off screen entirely instead of freezing it mid-run', () => {
    expect(cartRunnerCss).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.cart-runner\s*\{[\s\S]*?display:\s*none;/
    );
  });
});
