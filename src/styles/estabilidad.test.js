import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/* Estabilidad de la página (carga-y-estabilidad): reglas que jsdom no puede
   medir pintando, así que se comprueban sobre el código. */
const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('el contenido reserva su sitio', () => {
  it('el contenido principal ocupa al menos la pantalla, para que el pie empiece bajo el pliegue', () => {
    const base = read('styles/02-base.css');
    const rule = /\.app-main\s*\{([^}]*)\}/.exec(base)[1];

    expect(rule).toMatch(/min-height:\s*calc\(100vh - var\(--nav-h\)\)/);
    expect(rule).toMatch(/min-height:\s*calc\(100svh - var\(--nav-h\)\)/);
  });

  it('la pantalla de chat no hereda ese alto mínimo', () => {
    const base = read('styles/02-base.css');
    const rule = /\.app--chat \.app-main\s*\{([^}]*)\}/.exec(base)[1];

    expect(rule).toMatch(/min-height:\s*0/);
  });

  it.each([
    'components/NotFound.jsx',
    'features/studio/Studio.jsx',
    'features/studio/mesa/Publico.jsx',
    'features/crew/Crew.jsx',
  ])('todas las imágenes de %s declaran ancho y alto', (file) => {
    const images = read(file).match(/<img\b[\s\S]*?\/>/g) ?? [];

    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image, image.replace(/\s+/g, ' ').slice(0, 120)).toMatch(/\bwidth=/);
      expect(image).toMatch(/\bheight=/);
    }
  });

  it('el aviso de carga de la ruta, el del muro y el de la ficha usan el mismo contenedor', () => {
    for (const file of [
      'App.jsx',
      'features/drops/Muro.jsx',
      'features/catalog/ProductDetail.jsx',
    ]) {
      expect(read(file)).toMatch(/className="page-loading"/);
    }
    // Y ese contenedor reserva un alto: lo que llega después no empuja nada.
    const rule = /\.page-loading\s*\{([^}]*)\}/.exec(read('styles/03-utilities.css'))[1];
    expect(rule).toMatch(/min-height:/);
  });
});

/* Chrome solo anima en la GPU si las animaciones de un mismo elemento no se
   pisan la propiedad: con dos de `opacity` en el título de noche, el parpadeo
   infinito se quedaba en el hilo principal y recalculaba estilos a cada
   fotograma (medido: 365 recálculos en 6 s frente a 15). */
describe('el rótulo de neón se anima en la GPU', () => {
  const utilities = read('styles/03-utilities.css');
  const keyframes = (name) => {
    const start = utilities.indexOf(`@keyframes ${name} {`);
    expect(start, name).toBeGreaterThan(-1);
    const end = utilities.indexOf('\n  }\n', start);
    return utilities.slice(start, end);
  };
  const animated = (name) =>
    new Set([...keyframes(name).matchAll(/^\s+([a-z-]+):/gm)].map((match) => match[1]));

  it('el encendido y el parpadeo del título no animan la misma propiedad', () => {
    const rule = /\[data-theme='neon'\] \.page-title \{([^}]*)\}/.exec(utilities)[1];
    const names = [...rule.matchAll(/^\s+([a-z-]+) [\d.]+s/gm)].map((match) => match[1]);

    expect(names).toEqual(['neon-encendido', 'tubo-roto']);
    expect([...animated('tubo-roto')]).toEqual(['opacity']);
    expect([...animated('neon-encendido')]).toEqual(['filter']);
  });
});

/* La mesa sonando (medido con CPU ×4): 113 layouts y un 28 % del hilo en 6 s;
   con estas dos reglas, 3 layouts y un 14 %. */
describe('la mesa de beats no trabaja de más a cada paso', () => {
  const mesa = read('styles/components/beat-machine.css');
  const rule = (selector) => {
    const start = mesa.indexOf(`\n  ${selector} {`);
    expect(start, selector).toBeGreaterThan(-1);
    return mesa.slice(start, mesa.indexOf('\n  }', start));
  };

  it('el cabezal no arranca una transición de borde en las dieciséis celdas de cada paso', () => {
    expect(rule('.celda')).not.toMatch(/border-color [^;]*ease/);
    // Al pasar el puntero el borde sigue cambiando con suavidad
    expect(rule('.celda:hover')).toMatch(/transition:[^;]*border-color/);
  });

  it('las barras del vúmetro nunca llegan a opacidad 1: cruzarla rehace el layout', () => {
    expect(rule('.mesa-vu i')).toMatch(/opacity:\s*min\(\s*0\.999,/);
  });
});
