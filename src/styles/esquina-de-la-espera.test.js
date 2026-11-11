import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { rulesOf } from './cssRules.js';

/* La esquina de la espera (esquina-de-la-espera): las cabecitas son decoración.
   Un ::before sin texto no se anuncia; la máscara sigue el color del tema. */
const read = (file) => fs.readFileSync(path.join(import.meta.dirname, file), 'utf8');

describe('las cabecitas de la esquina', () => {
  it('son un ::before sin texto, pintado con la máscara del token', () => {
    const regla = rulesOf(read('components/cartel.css')).find(
      (rule) => rule.prelude === '.cartel-espera::before'
    );

    expect(regla).toBeDefined();
    expect(regla.body).toMatch(/content:\s*''/);
    expect(regla.body).toMatch(/mask:[^;]*var\(--cabecita\)/);
    expect(regla.body).toMatch(/background-color:\s*currentColor/);
    expect(read('00-tokens.css')).toMatch(/--cabecita:\s*url\("data:image\/svg\+xml/);
  });
});
