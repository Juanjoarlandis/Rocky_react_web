import { describe, expect, it } from 'vitest';
import { artSources } from './art.js';
import ollieHd from '../images/optimized/characters/skater-ollie-hd.webp';
import ollie320 from '../images/optimized/characters/skater-ollie-h320.webp';
import ollie640 from '../images/optimized/characters/skater-ollie-h640.webp';
import noAterriza800 from '../images/optimized/night/no-aterriza-800.webp';
import noAterriza320 from '../images/optimized/night/no-aterriza-h320.webp';
import noAterriza640 from '../images/optimized/night/no-aterriza-h640.webp';
import cotilla from '../images/optimized/characters/cotilla-esquina-460.webp';

describe('variante de una ilustración según el alto al que se pinta', () => {
  it('a 160 px o menos basta la de 320 px, también en pantallas de densidad 2', () => {
    expect(artSources(ollieHd, 140)).toEqual({ src: ollie320 });
    expect(artSources(ollieHd, 160)).toEqual({ src: ollie320 });
  });

  it('hasta 320 px ofrece la de 320 a densidad 1 y la de 640 a densidad 2', () => {
    expect(artSources(ollieHd, 193)).toEqual({
      src: ollie320,
      srcSet: `${ollie320} 1x, ${ollie640} 2x`,
    });
    expect(artSources(ollieHd, 320)).toEqual({
      src: ollie320,
      srcSet: `${ollie320} 1x, ${ollie640} 2x`,
    });
  });

  it('por encima de 320 px ofrece la de 640 y, a densidad 2, el original', () => {
    expect(artSources(ollieHd, 394)).toEqual({
      src: ollie640,
      srcSet: `${ollie640} 1x, ${ollieHd} 2x`,
    });
    expect(artSources(ollieHd, 700)).toEqual({ src: ollieHd });
  });

  it('las ilustraciones de noche tienen sus propias variantes', () => {
    expect(artSources(noAterriza800, 140)).toEqual({ src: noAterriza320 });
    expect(artSources(noAterriza800, 193)).toEqual({
      src: noAterriza320,
      srcSet: `${noAterriza320} 1x, ${noAterriza640} 2x`,
    });
  });

  it('una imagen sin variantes se pinta tal cual', () => {
    expect(artSources(cotilla, 140)).toEqual({ src: cotilla });
    expect(artSources('/products/rocky-racing.webp', 140)).toEqual({
      src: '/products/rocky-racing.webp',
    });
    expect(artSources(undefined, 140)).toEqual({ src: undefined });
  });
});

describe('emparejamiento día-noche por variante', () => {
  it('de noche, un dibujo emparejado usa la variante de su versión nocturna', async () => {
    const { nightArtFor } = await import('../features/night/nightArt.js');

    expect(artSources(nightArtFor(ollieHd), 140)).toEqual({ src: noAterriza320 });
    expect(artSources(nightArtFor(ollieHd), 193).srcSet).toBe(
      `${noAterriza320} 1x, ${noAterriza640} 2x`
    );
  });
});
