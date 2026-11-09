import { describe, expect, it } from 'vitest';
import { PALABRAS, claveDeAutor, generarFirma } from './firmas.mjs';

describe('firmas de la pared', () => {
  it('una firma es una palabra de la crew, un guion y un número del 1 al 99', () => {
    for (let i = 0; i < 200; i += 1) {
      const firma = generarFirma();
      expect(firma).toMatch(/^[A-Z]{3,10}-[1-9][0-9]?$/);
      expect(PALABRAS).toContain(firma.split('-')[0]);
    }
  });

  it('sale del azar que se le pase: sin texto de nadie', () => {
    expect(generarFirma(() => 0)).toBe(`${PALABRAS[0]}-1`);
    expect(generarFirma(() => 0.999999)).toBe(`${PALABRAS.at(-1)}-99`);
  });

  it('la clave de autor es estable por sesión y sal, corta y no revela la sesión', () => {
    const a = claveDeAutor('sesion-secreta-1', 'sal');
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(claveDeAutor('sesion-secreta-1', 'sal')).toBe(a);
    expect(claveDeAutor('sesion-secreta-2', 'sal')).not.toBe(a);
    expect(claveDeAutor('sesion-secreta-1', 'otra-sal')).not.toBe(a);
    expect(a).not.toContain('sesion');
  });

  it('sin sesión no hay clave', () => {
    expect(claveDeAutor('', 'sal')).toBe(null);
    expect(claveDeAutor(undefined, 'sal')).toBe(null);
  });
});
