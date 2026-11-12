/* LACOMA, el barrio de la crew (barrio-en-mapa): el trozo de plano que enseña el mapa y cómo
   se pasa de latitud y longitud al dibujo. Lo comparten la web (los puntos de los sitios) y
   scripts/plano-lacoma.mjs (el trazado de OpenStreetMap), para que punto y calle caigan en el
   mismo sitio. Unos 1150 × 710 m alrededor de los cuatro sitios, con el metro casi en medio. */

export const ENCUADRE = Object.freeze({
  sur: 40.4811,
  oeste: -3.72881,
  norte: 40.4875,
  este: -3.71531,
});

// El viewBox del dibujo.
export const ANCHO = 1000;
export const ALTO = 620;

/* Proyección en plano (equirectangular local): en 1 km cuadrado la curvatura no se nota, y la
   proporción del encuadre ya es la del dibujo. */
export function proyectar(lat, lon) {
  return {
    x: ((lon - ENCUADRE.oeste) / (ENCUADRE.este - ENCUADRE.oeste)) * ANCHO,
    y: ((ENCUADRE.norte - lat) / (ENCUADRE.norte - ENCUADRE.sur)) * ALTO,
  };
}
