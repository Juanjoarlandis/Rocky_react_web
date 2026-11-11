import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { rulesOf } from './cssRules.js';

/* La vida a la vista (vida-a-la-vista): contratos de CSS que jsdom no puede
   pintar, comprobados sobre las hojas. */
const read = (file) => fs.readFileSync(path.join(import.meta.dirname, file), 'utf8');
const inside = (rule, pattern) => rule.ancestors.some((open) => pattern.test(open));
const find = (css, test) => rulesOf(css).filter((rule) => test(rule.prelude.replace(/\s+/g, ' ')));

/* Especificidad aproximada (clases, pseudo-clases y atributos), suficiente
   para los selectores de estas hojas: :where() no cuenta; :not() y :has()
   cuentan por lo que llevan dentro. */
function specificity(selector) {
  const plain = selector.replace(/:where\([^)]*\)/g, '').replace(/:(?:not|has|is)\(/g, '(');
  return (plain.match(/\.[\w-]+|:[\w-]+|\[[^\]]+\]/g) ?? []).length;
}

describe('en táctil la mira barre el catálogo', () => {
  const media = read('components/product-media.css');
  const sweepBlocks = (rule) =>
    inside(rule, /^@media\b.*hover:\s*none.*prefers-reduced-motion:\s*no-preference/) &&
    inside(rule, /^@supports\s*\(animation-timeline:\s*view\(\)\)/);

  it('la tarjeta da su línea de tiempo y la retícula la sigue, solo en táctil y con movimiento', () => {
    const rules = rulesOf(media).filter(sweepBlocks);
    const card = rules.find((rule) => /view-timeline:\s*--tarjeta\s+block/.test(rule.body));
    const aim = rules.find((rule) => /animation-timeline:\s*--tarjeta/.test(rule.body));

    expect(card.prelude).toMatch(/^\.product-card/);
    expect(aim.prelude).toContain('.product-reticle-aim');
    expect(aim.body).toMatch(/animation:\s*mira-barre\b/);
    expect(aim.body).toMatch(/animation-range:/);
    expect(media).toMatch(/@keyframes mira-barre\s*\{/);
  });

  // Una animación gana a las declaraciones normales: sin esto, en una tableta
  // con teclado la mira del foco se quedaba a opacidad 0 lejos del centro.
  it('con el foco de teclado manda la mira de siempre, no el barrido', () => {
    const focus = rulesOf(media).find(
      (rule) =>
        sweepBlocks(rule) &&
        /\.product-media(:where\()?:focus-visible\)? \.product-reticle-aim/.test(rule.prelude) &&
        /animation:\s*none/.test(rule.body)
    );
    const aim = rulesOf(media).find(
      (rule) => sweepBlocks(rule) && /animation-timeline:\s*--tarjeta/.test(rule.body)
    );

    const shot = rulesOf(media).find(
      (rule) =>
        rule.prelude.startsWith('.product-card:has(.btn--added) .product-reticle-aim') &&
        /animation:\s*product-reticle-shot/.test(rule.body)
    );

    expect(focus).toBeDefined();
    // Gana al barrido (misma especificidad y va después) y pierde con el
    // disparo al añadir, que tiene que seguir mandando.
    expect(specificity(focus.prelude)).toBe(specificity(aim.prelude));
    expect(focus.line).toBeGreaterThan(aim.line);
    expect(specificity(focus.prelude)).toBeLessThan(specificity(shot.prelude.split(',')[0]));
  });

  it('un agotado no muestra la retícula al pasar', () => {
    const aim = rulesOf(media).find(
      (rule) => sweepBlocks(rule) && /animation-timeline:\s*--tarjeta/.test(rule.body)
    );

    expect(aim.prelude).toMatch(/:not\(:where\(\.is-sold-out\)\)/);
  });

  it('el disparo al añadir sigue mandando: más específico y con el atajo que reinicia la línea de tiempo', () => {
    const aim = rulesOf(media).find(
      (rule) => sweepBlocks(rule) && /animation-timeline:\s*--tarjeta/.test(rule.body)
    );
    const shot = rulesOf(media).find(
      (rule) =>
        rule.prelude.startsWith('.product-card:has(.btn--added) .product-reticle-aim') &&
        /animation:\s*product-reticle-shot/.test(rule.body)
    );
    const shotSelector = shot.prelude.split(',')[0];

    expect(shot.body).not.toMatch(/animation-timeline/);
    expect(specificity(shotSelector)).toBeGreaterThan(specificity(aim.prelude));
  });
});

describe('los rótulos llevan una segunda tinta corrida', () => {
  const utilities = read('03-utilities.css');
  const top = (prelude) =>
    rulesOf(utilities).filter(
      (rule) => rule.prelude === prelude && !inside(rule, /^@media|^@supports/)
    );

  it('de día, la segunda tinta es azul de la casa, dura y desplazada', () => {
    const title = top('.page-title').find((rule) => /text-shadow/.test(rule.body));

    expect(title.body).toMatch(
      /text-shadow:\s*[\d.]+em\s+[\d.]+em\s+0\s+rgba\(var\(--blue-rgb\),\s*[\d.]+\)/
    );
  });

  it('de noche manda el tubo de neón, con su propia sombra', () => {
    const neon = top("[data-theme='neon'] .page-title");

    expect(neon.some((rule) => /text-shadow:/.test(rule.body))).toBe(true);
    expect(neon.some((rule) => /animation:/.test(rule.body))).toBe(true);
  });

  it('la tinta entra en registro una vez, solo con movimiento sin reducir', () => {
    const entering = rulesOf(utilities).find(
      (rule) =>
        rule.prelude === '.page-title' &&
        inside(rule, /prefers-reduced-motion:\s*no-preference/) &&
        /animation:\s*tinta-registro\b/.test(rule.body)
    );

    expect(entering).toBeDefined();
    expect(entering.body).not.toMatch(/infinite/);
    expect(utilities).toMatch(/@keyframes tinta-registro\s*\{/);
  });

  // Con el mismo criterio que la escena: :where() no suma especificidad, así
  // que el neón de noche (más específico) sigue como hoy.
  it('bajo la intro esperan la tinta del rótulo y el tachón, como la escena', () => {
    const paused = rulesOf(utilities).filter((rule) =>
      /animation-play-state:\s*paused/.test(rule.body)
    );
    const selectors = paused.map((rule) => rule.prelude.replace(/\s+/g, ' ')).join(',');

    expect(selectors).toContain(':where(:root:has(.splash-intro)) .page-title');
    expect(selectors).toContain(':where(:root:has(.splash-intro)) .tachon::after');
    expect(selectors).not.toMatch(/(^|,)\s*:root:has\(\.splash-intro\)/);
  });
});

describe('el tachón es de rotulador, en el acento del tema', () => {
  const utilities = read('03-utilities.css');
  const tokens = read('00-tokens.css');
  const rule = (prelude, pattern = /^@layer/) =>
    rulesOf(utilities).find(
      (r) => r.prelude === prelude && r.ancestors.every((open) => pattern.test(open))
    );

  it('quita la raya recta del navegador y dibuja el trazo con una máscara del token', () => {
    expect(rule('.tachon').body).toMatch(/text-decoration:\s*none/);
    const stroke = rule('.tachon::after').body;

    // Del color del texto no se distingue de la palabra que tacha.
    expect(stroke).toMatch(/background-color:\s*var\(--accent\)/);
    expect(stroke).toMatch(/mask:[^;]*var\(--tachon-trazo\)/);
    expect(tokens).toMatch(/--tachon-trazo:\s*url\("data:image\/svg\+xml/);
  });

  it('se dibuja una vez, solo con movimiento sin reducir', () => {
    const moving = rulesOf(utilities).find(
      (r) =>
        r.prelude === '.tachon::after' &&
        inside(r, /prefers-reduced-motion:\s*no-preference/) &&
        /animation:\s*tachon-traza\b/.test(r.body)
    );

    expect(moving).toBeDefined();
    expect(moving.body).not.toMatch(/infinite/);
    expect(rule('.tachon::after').body).not.toMatch(/animation/);
  });
});

describe('la escena de la portada espera a la intro', () => {
  const home = read('pages/home.css');

  it('mientras está la intro, la línea, las gotas y la Cruiser se quedan en pausa', () => {
    const paused = find(home, (prelude) => prelude.includes(':has(.splash-intro)')).filter((rule) =>
      /animation-play-state:\s*paused/.test(rule.body)
    );
    const selectors = paused.map((rule) => rule.prelude).join(',');

    expect(paused.length).toBeGreaterThan(0);
    for (const piece of ['.spray-line path', '.spray-chorro i', '.spray-cruiser']) {
      expect(selectors).toContain(piece);
    }
  });

  it('con movimiento reducido la escena sigue quieta y pintada, como antes', () => {
    const reduced = rulesOf(home).filter((rule) =>
      inside(rule, /prefers-reduced-motion:\s*reduce/)
    );
    const line = reduced.find((rule) => rule.prelude === '.spray-line path');
    const cruiser = reduced.find((rule) => rule.prelude === '.spray-cruiser');

    expect(line.body).toMatch(/animation:\s*none/);
    expect(line.body).toMatch(/stroke-dashoffset:\s*0/);
    expect(cruiser.body).toMatch(/animation:\s*none/);
  });
});
