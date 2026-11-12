import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { rulesOf } from './cssRules.js';

/* El giro 3D (cromos-en-cualquier-navegador): una cara que oculta su reverso tiene que aislar sus
   capas. Si no, una mezcla de dentro (el sello «FICHADO», con multiply) aplana en Firefox la carta
   que gira y la enseña en espejo, y un z-index de dentro se pinta fuera de la cara y se transparenta
   al girar. En Chrome no se ve, y jsdom no pinta: se comprueba sobre el código.

   Límites conocidos: mira cada regla por separado (un `isolation: auto` en otra regla que pise a
   la cara no lo ve) y vigila las caras, no la carta que gira: una mezcla puesta directamente en el
   elemento con `preserve-3d` aplanaría igual sin que esto falle. */
const root = path.resolve(import.meta.dirname);
const OCULTA_EL_REVERSO = /(?:^|[;{])\s*(?:-webkit-)?backface-visibility\s*:\s*hidden\b/i;
const AISLAMIENTO = /(?:^|[;{])\s*isolation\s*:\s*([a-z-]+)/gi;

// Manda la última declaración de `isolation` de la regla, como en la cascada.
const aisla = (body) =>
  [...`;${body}`.matchAll(AISLAMIENTO)].at(-1)?.[1].toLowerCase() === 'isolate';

function cssFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(full);
    return entry.name.endsWith('.css') ? [full] : [];
  });
}

function carasSinAislar(css) {
  return rulesOf(css).filter(
    (rule) =>
      !rule.prelude.startsWith('@') &&
      !rule.ancestors.some((open) => /^@keyframes\b/i.test(open)) &&
      OCULTA_EL_REVERSO.test(`;${rule.body}`) &&
      !aisla(rule.body)
  );
}

describe('el comprobador de caras', () => {
  it('señala la cara que oculta su reverso sin aislar sus capas, también bajo @layer', () => {
    const css = `@layer components {
      .a { backface-visibility: hidden; }
      .b { backface-visibility: hidden; isolation: isolate; }
      .c { -webkit-backface-visibility: hidden; backface-visibility:hidden }
      .d { backface-visibility: visible; }
      /* .e { backface-visibility: hidden; } */
      .f { -webkit-backface-visibility: hidden; }
      .g { BACKFACE-VISIBILITY: HIDDEN; Isolation: Isolate; }
      .h { backface-visibility: hidden; isolation: isolate; isolation: auto; }
      @keyframes i { from { backface-visibility: hidden; } }
    }`;

    expect(carasSinAislar(css).map((rule) => rule.prelude)).toEqual(['.a', '.c', '.f', '.h']);
  });
});

describe('las hojas de estilo', () => {
  it('ninguna cara de un giro 3D deja escapar sus capas', () => {
    const fallos = cssFiles(root).flatMap((file) =>
      carasSinAislar(fs.readFileSync(file, 'utf8')).map(
        (rule) => `${path.relative(root, file)}:${rule.line} ${rule.prelude}`
      )
    );

    expect(fallos).toEqual([]);
  });

  // Que la prueba de arriba no pase en vacío: el álbum gira sus cromos con caras así.
  it('el álbum sigue teniendo caras que ocultan su reverso', () => {
    const crew = fs.readFileSync(path.join(root, 'pages/crew.css'), 'utf8');
    const caras = rulesOf(crew).filter((rule) => OCULTA_EL_REVERSO.test(`;${rule.body}`));

    expect(caras.map((rule) => rule.prelude)).toContain('.crew-card-face');
  });
});
