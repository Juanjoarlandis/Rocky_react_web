import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EncryptedStore } from '../../storage/encrypted-file-store.mjs';
import { createWallPersistence } from './persistencia.mjs';

const key = crypto.randomBytes(32).toString('base64');
const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

async function ruta() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-pared-test-'));
  return path.join(dir, 'pared.enc');
}

async function leerDeDisco(filePath) {
  return new EncryptedStore({ filePath, key }).get('pared', 'estado');
}

describe('persistencia de la pared', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sin fichero arranca vacía y sin error', async () => {
    const p = createWallPersistence({ filePath: await ruta(), key, obtener: () => ({}) });
    expect(await p.cargar()).toEqual({ estado: null, corrupto: false });
  });

  it('agrupa los cambios: una escritura por ventana, con el estado del momento de escribir', async () => {
    vi.useFakeTimers();
    const filePath = await ruta();
    let estado = { n: 1 };
    const p = createWallPersistence({ filePath, key, obtener: () => estado, retrasoMs: 60_000 });
    await p.cargar();
    const escribir = vi.spyOn(EncryptedStore.prototype, 'set');
    p.programar();
    estado = { n: 2 };
    p.programar();
    estado = { n: 3 };
    p.programar();
    expect(escribir).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    await p.volcar();
    expect(escribir).toHaveBeenCalledTimes(1);
    escribir.mockRestore();
    vi.useRealTimers();
    expect(await leerDeDisco(filePath)).toEqual({ n: 3 });
  });

  it('volcar escribe al momento (al apagar el servidor) y se recupera al arrancar', async () => {
    const filePath = await ruta();
    const p = createWallPersistence({ filePath, key, obtener: () => ({ hola: 'pared' }) });
    await p.cargar();
    p.programar();
    await p.volcar();
    const otra = createWallPersistence({ filePath, key, obtener: () => ({}) });
    expect(await otra.cargar()).toEqual({ estado: { hola: 'pared' }, corrupto: false });
  });

  it('un fichero corrupto no tumba el arranque, se registra y no se pisa', async () => {
    const filePath = await ruta();
    await fs.writeFile(filePath, 'esto no es un sobre cifrado');
    const log = logger();
    const p = createWallPersistence({ filePath, key, obtener: () => ({ n: 1 }), logger: log });
    expect(await p.cargar()).toEqual({ estado: null, corrupto: true });
    expect(log.error).toHaveBeenCalled();
    p.programar();
    await p.volcar();
    expect(await fs.readFile(filePath, 'utf8')).toBe('esto no es un sobre cifrado');
  });

  it('apartar el corrupto lo guarda aparte y vuelve a escribir', async () => {
    const filePath = await ruta();
    await fs.writeFile(filePath, 'roto');
    const p = createWallPersistence({ filePath, key, obtener: () => ({ n: 9 }), logger: logger() });
    await p.cargar();
    await p.apartarCorrupto();
    p.programar();
    await p.volcar();
    expect(await leerDeDisco(filePath)).toEqual({ n: 9 });
    const ficheros = await fs.readdir(path.dirname(filePath));
    expect(ficheros.some((f) => f.startsWith('pared.enc.corrupto-'))).toBe(true);
  });

  it('sin clave (desarrollo sin estado cifrado) vive solo en memoria', async () => {
    const p = createWallPersistence({ filePath: await ruta(), key: '', obtener: () => ({ n: 1 }) });
    expect(await p.cargar()).toEqual({ estado: null, corrupto: false });
    p.programar();
    await expect(p.volcar()).resolves.toBeUndefined();
  });

  it('si una escritura falla, vuelve a intentarlo aunque no haya más cambios', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-pared-test-'));
    // El «directorio» del fichero es un fichero: no se puede escribir ahí.
    await fs.writeFile(path.join(dir, 'tapon'), 'x');
    const log = logger();
    const p = createWallPersistence({
      filePath: path.join(dir, 'tapon', 'pared.enc'),
      key,
      obtener: () => ({ n: 1 }),
      retrasoMs: 5,
      logger: log,
    });
    p.programar();
    await vi.waitFor(() => expect(log.error.mock.calls.length).toBeGreaterThanOrEqual(2), {
      timeout: 2000,
    });
    // Y cuando vuelve a poder, guarda lo pendiente.
    await fs.rm(path.join(dir, 'tapon'));
    await vi.waitFor(
      async () => expect(await leerDeDisco(path.join(dir, 'tapon', 'pared.enc'))).toEqual({ n: 1 }),
      {
        timeout: 2000,
      }
    );
  });
});
