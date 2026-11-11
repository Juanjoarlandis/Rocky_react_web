import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { rulesOf } from './cssRules.js';

/* Interacción táctil (vida-a-la-vista): lo que se mueve al pasar el puntero
   solo se mueve con puntero. En una pantalla táctil el :hover se queda pegado
   tras el toque, así que toda regla con :hover que desplace, gire o escale algo
   tiene que vivir dentro de un @media (hover: hover). Se comprueba sobre el
   código porque jsdom no pinta. Solo ve las propiedades que mueven escritas en
   la regla: un :hover que dispara una animación de una vez o cambia una
   variable (el brillo de los cromos) no deja nada levantado y queda fuera. */
const root = path.resolve(import.meta.dirname);
const MOVES = /(?:^|[;{])\s*(transform|translate|rotate|scale)\s*:/;

function cssFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(full);
    return entry.name.endsWith('.css') ? [full] : [];
  });
}

/* Las reglas dentro de `prefers-reduced-motion: reduce` no mueven nada: anulan
   el movimiento para quien lo pide, y pueden quedarse donde están. */
const insideMedia = (rule, pattern) =>
  rule.ancestors.some((open) => open.startsWith('@media') && pattern.test(open));

function hoverMovesOutsideHoverMedia(css) {
  return rulesOf(css).filter(
    (rule) =>
      !rule.prelude.startsWith('@') &&
      rule.prelude.includes(':hover') &&
      MOVES.test(`;${rule.body}`) &&
      !insideMedia(rule, /\bhover\s*:\s*hover\b/) &&
      !insideMedia(rule, /prefers-reduced-motion\s*:\s*reduce/)
  );
}

describe('el analizador de llaves', () => {
  it('distingue la regla dentro y fuera de @media (hover: hover), también bajo @layer', () => {
    const css = `@layer pages {
      .a:hover { transform: rotate(2deg); }
      @media (hover: hover) { .b:hover { translate: 0 -2px; } }
      .c:hover { color: red; transition: transform 1s; }
      .d:hover,
      .d:focus-visible { scale: 1.1; }
      @media (prefers-reduced-motion: reduce) { .g:hover { transform: none; } }
    }`;

    expect(hoverMovesOutsideHoverMedia(css).map((rule) => rule.prelude)).toEqual([
      '.a:hover',
      '.d:hover,\n      .d:focus-visible',
    ]);
  });

  it('no confunde llaves dentro de cadenas ni de comentarios', () => {
    const css = `/* .x:hover { transform: none } */
      .e::before { content: '{'; }
      .f:hover { rotate: 3deg; }`;

    expect(hoverMovesOutsideHoverMedia(css).map((rule) => rule.line)).toEqual([3]);
  });
});

describe('en táctil nada se queda levantado tras un toque', () => {
  it('toda regla :hover que mueve, gira o escala está dentro de @media (hover: hover)', () => {
    const violations = cssFiles(root).flatMap((file) =>
      hoverMovesOutsideHoverMedia(fs.readFileSync(file, 'utf8')).map(
        (rule) => `${path.relative(root, file)}:${rule.line} ${rule.prelude.replace(/\s+/g, ' ')}`
      )
    );

    expect(violations).toEqual([]);
  });
});

/* Las reglas partidas: la mitad de foco o de estado se quedó fuera del @media
   con las mismas declaraciones, para que el teclado y la página activa se
   vean igual en cualquier pantalla. */
describe('el teclado y el estado activo conservan sus señales', () => {
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const outside = (css, prelude) =>
    rulesOf(css).find(
      (rule) =>
        rule.prelude === prelude &&
        !rule.ancestors.some((open) => /\bhover\s*:\s*hover\b/.test(open))
    );

  it.each([
    [
      'pages/chat.css',
      '.chat-quick-prompt:focus-visible',
      /transform:\s*translateY\(-2px\) rotate\(-1deg\)/,
    ],
    ['pages/chat.css', '.chat-send:focus-visible', /transform:\s*translate\(-1px, -1px\)/],
    [
      'components/navbar.css',
      '.navbar-account--avatar.is-active',
      /transform:\s*rotate\(-4deg\) scale\(1\.06\)/,
    ],
  ])('%s: %s sigue fuera del @media y se mueve como antes', (file, prelude, movement) => {
    const rule = outside(read(file), prelude);

    expect(rule, prelude).toBeDefined();
    expect(rule.body).toMatch(movement);
  });
});
