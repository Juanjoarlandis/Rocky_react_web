import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NODE_BINARY, directorySums, imageSums } from './docker.mjs';
import { diffSha256Sums } from './lib.mjs';

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rocky-sums-test-'));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const sha = (text) => createHash('sha256').update(text).digest('hex');

describe('huellas de una carpeta', () => {
  it('da una línea por fichero con el formato de sha256sum, ordenadas y con ./ delante', () => {
    fs.mkdirSync(path.join(dir, 'server/http'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'server/http/app.mjs'), 'b');
    fs.writeFileSync(path.join(dir, 'package.json'), 'a');
    fs.writeFileSync(path.join(dir, 'server/z con espacio.mjs'), 'c');

    expect(directorySums(dir)).toBe(
      [
        `${sha('a')}  ./package.json`,
        `${sha('b')}  ./server/http/app.mjs`,
        `${sha('c')}  ./server/z con espacio.mjs`,
      ].join('\n')
    );
  });

  it('no sigue enlaces simbólicos ni cuenta carpetas vacías, como find -type f', () => {
    fs.mkdirSync(path.join(dir, 'vacia'));
    fs.writeFileSync(path.join(dir, 'real.txt'), 'x');
    fs.symlinkSync(path.join(dir, 'real.txt'), path.join(dir, 'enlace.txt'));
    fs.symlinkSync('/etc', path.join(dir, 'fuera'));

    expect(directorySums(dir)).toBe(`${sha('x')}  ./real.txt`);
  });

  it('coincide con lo que da sha256sum de verdad sobre la misma carpeta', async () => {
    const { execFileSync } = await import('node:child_process');
    fs.mkdirSync(path.join(dir, 'a/b'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'a/b/uno.js'), 'uno');
    fs.writeFileSync(path.join(dir, 'dos.css'), 'dos');
    const real = execFileSync(
      'sh',
      ['-c', 'find . -type f -print0 | sort -z | xargs -0 sha256sum'],
      { cwd: dir, encoding: 'utf8' }
    );

    expect(diffSha256Sums(directorySums(dir), real)).toEqual([]);
  });

  it('las huellas de la imagen son las de /app más la del binario de Node, con su ruta absoluta', () => {
    fs.mkdirSync(path.join(dir, 'app/server'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'app/server/index.mjs'), 's');
    fs.writeFileSync(path.join(dir, 'node'), 'binario');

    expect(NODE_BINARY).toBe('/usr/local/bin/node');
    expect(imageSums({ app: path.join(dir, 'app'), node: path.join(dir, 'node') })).toBe(
      [`${sha('s')}  ./server/index.mjs`, `${sha('binario')}  /usr/local/bin/node`].join('\n')
    );
  });
});
