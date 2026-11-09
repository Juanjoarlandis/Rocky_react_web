import { describe, expect, it, vi } from 'vitest';
import { createWallService } from './servicio.mjs';

const trazo = { c: 0, s: 1, p: [0, 10, 2, 12], d: [] };
const config = (patch = {}) => ({
  enabled: true,
  filePath: '/tmp/no-se-usa.enc',
  key: '',
  ...patch,
});

async function servicio(patch, persistencia) {
  const s = createWallService({ config: config(patch), persistencia });
  await s.listo;
  return s;
}

describe('servicio de la pared', () => {
  it('sin configurar está apagada y lo dice', async () => {
    const s = await servicio({ enabled: false });
    expect(s.activa()).toBe(false);
    expect(s.estado()).toEqual({ configurada: false, encendida: true, corrupta: false });
  });

  it('el autor sale de la sesión y su firma no se crea solo por mirar', async () => {
    const s = await servicio();
    const sesion = { key: 'sesion-de-ana' };
    expect(s.leer({ pagina: '/crew', ancho: 'ancha', sesion }).firma).toBe(null);
    const { firma } = s.pintar({ pagina: '/crew', ancho: 'ancha', sesion, trazo });
    expect(s.leer({ pagina: '/crew', ancho: 'ancha', sesion }).firma).toBe(firma);
    expect(s.leer({ pagina: '/crew', ancho: 'ancha', sesion: null }).firmas).toEqual([
      { firma, mia: false },
    ]);
  });

  it('cada cambio programa el guardado', async () => {
    const programar = vi.fn();
    const s = await servicio(
      {},
      {
        cargar: async () => ({ estado: null, corrupto: false }),
        programar,
        volcar: async () => {},
        apartarCorrupto: async () => {},
        corrupto: false,
      }
    );
    s.pintar({ pagina: '/crew', ancho: 'ancha', sesion: { key: 'a' }, trazo });
    expect(programar).toHaveBeenCalled();
  });

  it('con el fichero corrupto arranca apagada y al encenderla desde El Taller lo aparta', async () => {
    let corrupto = true;
    const apartarCorrupto = vi.fn(async () => {
      corrupto = false;
    });
    const s = await servicio(
      {},
      {
        cargar: async () => ({ estado: null, corrupto: true }),
        programar: vi.fn(),
        volcar: async () => {},
        apartarCorrupto,
        get corrupto() {
          return corrupto;
        },
      }
    );
    expect(s.activa()).toBe(false);
    expect(s.estado().corrupta).toBe(true);
    await s.encender(true);
    expect(apartarCorrupto).toHaveBeenCalled();
    expect(s.activa()).toBe(true);
  });

  it('el interruptor apaga al momento', async () => {
    const s = await servicio();
    await s.encender(false);
    expect(s.activa()).toBe(false);
    expect(s.estado().encendida).toBe(false);
  });

  it('varias sesiones desde la misma red cuentan como un reporte, y la red no va al fichero', async () => {
    const s = await servicio();
    const { firma } = s.pintar({ pagina: '/crew', ancho: 'ancha', sesion: { key: 'ana' }, trazo });
    const reportar = (key, cliente) =>
      s.reportar({ pagina: '/crew', ancho: 'ancha', sesion: { key }, cliente, firma });
    for (const key of ['r1', 'r2', 'r3']) expect(reportar(key, '203.0.113.7').oculta).toBe(false);
    expect(reportar('r4', '198.51.100.2').oculta).toBe(false);
    expect(reportar('r5', '2001:db8:1:2::/64').oculta).toBe(true);
    const guardado = JSON.stringify(s.snapshot());
    expect(guardado).not.toContain('203.0.113.7');
    expect(guardado).not.toContain('2001:db8');
  });

  it('mientras carga el fichero no está activa: no se pierde nada de lo que llegue', async () => {
    let cargado;
    const s = createWallService({
      config: config(),
      persistencia: {
        cargar: () =>
          new Promise((resolve) => {
            cargado = () => resolve({ estado: null, corrupto: false });
          }),
        programar: () => {},
        volcar: async () => {},
        apartarCorrupto: async () => {},
        corrupto: false,
      },
    });
    expect(s.activa()).toBe(false);
    cargado();
    await s.listo;
    expect(s.activa()).toBe(true);
  });
});
