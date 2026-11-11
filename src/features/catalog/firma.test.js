import { describe, expect, it } from 'vitest';
import { leerFirma } from './firma.js';

/* La voz de la crew (voz-de-la-crew): una descripción que termina en «— Nombre»
   con el nombre exacto de alguien de la crew la firma ese muñeco. Shopify la
   manda en una sola línea, así que no se cuenta con saltos ni con espacios. */
const CREW = ['El Paquetes', 'Rocky', 'El Tele', 'La Cruiser'];

describe('leerFirma', () => {
  it('separa el texto de la firma, con espacios alrededor de la raya', () => {
    expect(leerFirma('No la suelto ni en la lavadora. — El Paquetes', CREW)).toEqual({
      texto: 'No la suelto ni en la lavadora.',
      firma: 'El Paquetes',
    });
  });

  it('la reconoce pegada al texto, como la aplana Shopify', () => {
    expect(leerFirma('No la suelto ni en la lavadora.—El Paquetes', CREW)).toEqual({
      texto: 'No la suelto ni en la lavadora.',
      firma: 'El Paquetes',
    });
  });

  it.each(['–', '-'])(
    'vale también con la raya corta y con el guion tras un punto (%s)',
    (raya) => {
      expect(leerFirma(`Mientras tanto, guau. ${raya} Rocky`, CREW)).toEqual({
        texto: 'Mientras tanto, guau.',
        firma: 'Rocky',
      });
    }
  );

  it.each(['—', '–'])('la raya (%s) firma aunque vaya pegada a una letra', (raya) => {
    expect(leerFirma(`Mientras tanto, guau${raya}Rocky`, CREW)).toEqual({
      texto: 'Mientras tanto, guau',
      firma: 'Rocky',
    });
    expect(leerFirma(`Mientras tanto, guau${raya} Rocky`, CREW).firma).toBe('Rocky');
  });

  // El guion corto es el que se cuela en nombres de producto («ROCKY 035 -
  // Rocky»): solo firma tras un final de frase.
  it('el guion corto solo firma detrás de un final de frase', () => {
    const marca = 'Camiseta de la colección ROCKY 035 - Rocky';

    expect(leerFirma(marca, CREW)).toEqual({ texto: marca, firma: null });
    expect(leerFirma('Mientras tanto, guau! - Rocky', CREW).firma).toBe('Rocky');
    expect(leerFirma('¿Quién es el jefe? - Rocky', CREW).firma).toBe('Rocky');
  });

  it('una raya doble no deja restos en el texto', () => {
    expect(leerFirma('Texto. -- Rocky', CREW)).toEqual({ texto: 'Texto.', firma: 'Rocky' });
    expect(leerFirma('Texto. — — Rocky', CREW)).toEqual({ texto: 'Texto.', firma: 'Rocky' });
  });

  it('tolera lo que se cuela al escribir o pegar: punto final, tildes descompuestas, espacios raros', () => {
    const vigia = ['El Vigía'];

    expect(leerFirma('Me lo dijo. — Rocky.', CREW).firma).toBe('Rocky');
    expect(leerFirma('De aquí no pasa nadie. — El Vigía', vigia).firma).toBe('El Vigía');
    expect(leerFirma('Y punto. — El Paquetes', CREW).firma).toBe('El Paquetes');
    expect(leerFirma('Y punto. — El  Paquetes​', CREW).firma).toBe('El Paquetes');
    expect(leerFirma('Y punto. ― El Tele', CREW).firma).toBe('El Tele');
  });

  it('un nombre que no es de la crew no firma: el texto queda entero', () => {
    const texto = 'Camiseta negra con estampado. — Juan';

    expect(leerFirma(texto, CREW)).toEqual({ texto, firma: null });
  });

  it('el nombre tiene que ser exacto', () => {
    const texto = 'Mil canales y ninguno. — el tele';

    expect(leerFirma(texto, CREW)).toEqual({ texto, firma: null });
  });

  it('la firma en mitad del texto no cuenta', () => {
    const texto = 'Me lo dijo — El Tele y era verdad.';

    expect(leerFirma(texto, CREW)).toEqual({ texto, firma: null });
  });

  it('un guion dentro de una palabra no es una firma', () => {
    const texto = 'Edición anti-Rocky';

    expect(leerFirma(texto, CREW)).toEqual({ texto, firma: null });
  });

  it('sin crew no firma nadie, aunque el texto acabe en raya', () => {
    expect(leerFirma('Corre que vuela —', [])).toEqual({ texto: 'Corre que vuela —', firma: null });
  });

  // Solo se mira el final: un texto enorme no hace trabajar de más.
  it('en un texto muy largo encuentra la firma del final', () => {
    const largo = 'Camiseta oversize. '.repeat(500);

    expect(leerFirma(`${largo}— Rocky`, CREW)).toEqual({ texto: largo.trim(), firma: 'Rocky' });
    expect(leerFirma('—'.repeat(20000), CREW).firma).toBeNull();
  });

  it('sin texto no hay nada que firmar', () => {
    expect(leerFirma('', CREW)).toEqual({ texto: '', firma: null });
    expect(leerFirma(undefined, CREW)).toEqual({ texto: '', firma: null });
  });

  it('solo la firma, sin texto, no deja un párrafo vacío ni firma', () => {
    expect(leerFirma('— El Paquetes', CREW)).toEqual({ texto: '', firma: null });
  });
});
