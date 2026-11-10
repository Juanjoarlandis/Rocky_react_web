import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { nativePackages, productionPackages } from './lib.mjs';

/* despliegue-ligero: la imagen se construye en el equipo del operador para la
   arquitectura de producción sin emulación. Eso solo vale mientras la etapa
   final del Dockerfile no ejecute nada y las dependencias de producción sean
   JavaScript puro. Estas dos guardas mantienen cierta la premisa. */
const root = path.resolve(import.meta.dirname, '../..');
const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
const instructions = dockerfile
  .replace(/\\\n/g, ' ')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

describe('Dockerfile construible sin emulación', () => {
  it('la etapa de build corre en la plataforma de quien construye', () => {
    const stages = instructions.filter((line) => /^FROM\s/i.test(line));

    expect(stages).toHaveLength(2);
    expect(stages[0]).toMatch(/^FROM --platform=\$BUILDPLATFORM \S+ AS build$/);
    // La de runtime es de la plataforma de destino: no fija ninguna.
    expect(stages[1]).not.toMatch(/--platform/);
    expect(stages[1]).toMatch(/ AS runtime$/);
  });

  it('la etapa final no ejecuta nada: solo copia ficheros y declara metadatos', () => {
    const lastFrom = instructions.findLastIndex((line) => /^FROM\s/i.test(line));
    const runtime = instructions
      .slice(lastFrom + 1)
      .map((line) => line.split(/\s+/)[0].toUpperCase());

    expect(runtime).not.toContain('RUN');
    expect(new Set(runtime)).toEqual(
      new Set(['ENV', 'WORKDIR', 'COPY', 'USER', 'EXPOSE', 'HEALTHCHECK', 'CMD'])
    );
  });

  it('la etapa de build no deja en node_modules la caché de las pruebas: cambia en cada build', () => {
    // `vitest run` escribe node_modules/.vite/vitest/<hash>/results.json con la
    // duración de cada prueba. Con él dentro, dos builds del mismo commit nunca
    // darían las mismas huellas y el camino de respaldo no pasaría su verificación.
    const build = instructions.slice(
      0,
      instructions.findLastIndex((line) => /^FROM\s/i.test(line))
    );
    const last = build.findLast((line) => /^RUN\s/i.test(line));

    expect(last).toMatch(/npm prune --omit=dev/);
    expect(last).toMatch(/rm -rf node_modules\/\.vite/);
  });

  it('las dos etapas parten de la misma imagen base, fijada por digest', () => {
    const bases = instructions
      .filter((line) => /^FROM\s/i.test(line))
      .map((line) => line.split(/\s+/).find((word) => word.includes('@sha256:')));

    expect(bases[0]).toMatch(/^node:[\d.]+-bookworm-slim@sha256:[0-9a-f]{64}$/);
    expect(bases[1]).toBe(bases[0]);
  });
});

describe('dependencias de producción sin binarios nativos', () => {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

  it('el árbol de producción de hoy no lleva ninguno', () => {
    expect(nativePackages(lock)).toEqual([]);
  });

  it('las librerías del cliente no están en el árbol de producción', () => {
    const names = productionPackages(lock).map((entry) => entry.name);

    expect(names).toContain('express');
    for (const name of ['react', 'react-dom', 'react-router', 'scheduler']) {
      expect(names).not.toContain(name);
    }
  });

  it('nombra al paquete que declara sistema, procesador, script de instalación o binding', () => {
    const fake = {
      packages: {
        '': { dependencies: { limpio: '1.0.0' } },
        'node_modules/limpio': { version: '1.0.0' },
        'node_modules/solo-linux': { version: '2.0.0', os: ['linux'] },
        'node_modules/solo-arm': { version: '3.0.0', cpu: ['arm64'] },
        'node_modules/compila': { version: '4.0.0', hasInstallScript: true },
        'node_modules/con-gyp': { version: '5.0.0', gypfile: true },
        'node_modules/a/node_modules/anidado': { version: '6.0.0', cpu: ['x64'] },
        // Lo de desarrollo y lo opcional de desarrollo no viaja en la imagen
        'node_modules/esbuild': { version: '7.0.0', dev: true, hasInstallScript: true },
        'node_modules/@rolldown/binding': {
          version: '8.0.0',
          dev: true,
          optional: true,
          cpu: ['x64'],
        },
      },
    };

    expect(nativePackages(fake)).toEqual([
      'a/node_modules/anidado@6.0.0 (cpu)',
      'compila@4.0.0 (script de instalación)',
      'con-gyp@5.0.0 (binding nativo)',
      'solo-arm@3.0.0 (cpu)',
      'solo-linux@2.0.0 (os)',
    ]);
  });
});

describe('límite de memoria del contenedor de producción', () => {
  const compose = fs.readFileSync(path.join(root, 'compose.production.yaml'), 'utf8');

  it('192 MB por defecto, sin intercambio, y ajustable desde el selector de la release', () => {
    expect(compose).toMatch(/^ {4}mem_limit: \$\{ROCKY_MEM_LIMIT:-192m\}$/m);
    // El mismo valor como memoria más intercambio: no hay intercambio
    expect(compose).toMatch(/^ {4}memswap_limit: \$\{ROCKY_MEM_LIMIT:-192m\}$/m);
    // Sin cuota de CPU: solo añadiría latencia
    expect(compose).not.toMatch(/^\s*(cpus|cpu_quota|cpu_shares):/m);
  });
});
