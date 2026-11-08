import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('exportación de avisos', () => {
  it('rechaza el borrado desde un segundo escritor antes de abrir el almacén', () => {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('./exportar-avisos.mjs', import.meta.url)), '--vaciar', 'rockyracing'],
      {
        encoding: 'utf8',
        env: { PATH: process.env.PATH, STATE_STORE_PATH: '/no-debe-abrirse/state.enc' },
      }
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('sólo permite lectura');
    expect(result.stderr).not.toContain('Falta APP_ENCRYPTION_KEY');
  });
});
