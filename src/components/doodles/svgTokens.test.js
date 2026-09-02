import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Los SVG inline se tiñen con los tokens del tema: un hex incrustado se
// quedaría del color de día en el modo neón (html[data-theme='neon']).
const SVG_SOURCES = [
  'src/features/music/Boombox.jsx',
  'src/components/doodles/CrosshairSpinner.jsx',
  'src/components/icons/EyeIcon.jsx',
  'src/features/studio/Studio.jsx',
  'src/features/studio/BeatMachine.jsx',
  'src/features/studio/BeatPads.jsx',
  'src/components/icons/PlayerIcons.jsx',
  'src/components/doodles/BeeDoodle.jsx',
  'src/components/doodles/ColmenaSticker.jsx',
  'src/components/doodles/EpCover.jsx',
];

const HEX_COLOR = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/i;
const TOKEN = /var\(--([\w-]+)\)/g;

const globalCss = readFileSync('src/styles/00-tokens.css', 'utf8');
const studioCss = readFileSync('src/styles/pages/studio.css', 'utf8');

function declaredTokens(css, selector) {
  const block = css.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\}`));
  return new Set([...(block?.[1] ?? '').matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]));
}

const rootTokens = declaredTokens(globalCss, ':root');
const neonTokens = declaredTokens(globalCss, "html\\[data-theme='neon'\\]");
// La miel es de la página del estudio, y es la misma de día y de noche.
const pageTokens = declaredTokens(studioCss, '\\.studio');

describe('SVG inline sin colores incrustados', () => {
  it.each(SVG_SOURCES)('%s no lleva ningún hex de color', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(HEX_COLOR);
  });

  it.each(SVG_SOURCES)('%s sólo usa tokens que el modo neón redefine', (file) => {
    const source = readFileSync(file, 'utf8');
    const tokens = new Set([...source.matchAll(TOKEN)].map((m) => m[1]));
    tokens.forEach((token) => {
      if (pageTokens.has(token)) return;
      expect(rootTokens.has(token), `--${token} en :root`).toBe(true);
      expect(neonTokens.has(token), `--${token} en el modo neón`).toBe(true);
    });
  });

  it('la abeja y la pegatina toman la miel por currentColor', () => {
    expect(readFileSync('src/components/doodles/BeeDoodle.jsx', 'utf8')).toMatch(
      /fill="currentColor"/
    );
    expect(readFileSync('src/components/doodles/ColmenaSticker.jsx', 'utf8')).toMatch(
      /fill="currentColor"/
    );
    expect(pageTokens.has('honey')).toBe(true);
    expect(studioCss).toMatch(/\.studio-bee\s*\{[\s\S]*?color:\s*var\(--honey\);/);
    expect(studioCss).toMatch(/\.studio-sticker\s*\{[\s\S]*?color:\s*var\(--honey\);/);
  });

  it('la portada de EP es un bloque entintado', () => {
    const source = readFileSync('src/components/doodles/EpCover.jsx', 'utf8');
    expect(source).toMatch(/fill="var\(--ink-block\)"/);
    expect(source).toMatch(/fill="var\(--ink-block-text\)"/);
  });
});
