/* La pegatina arrancada de un producto agotado (idea 7 de dirección
   artística): como un slap medio rascado de una farola, queda el papel con el
   borde roto tapando algo más de un tercio de la foto, y el estampado se
   sigue viendo. El desgarro sigue una curva con barriga, con dientes en
   grupos, dos tramos lisos y dos mordiscos suaves: un diente de sierra regular
   no se lee como papel roto. La mitad de los productos lo llevan en espejo
   (tornVariant.js y home.css), para que un drop agotado no sea un muro de
   desgarros idénticos. Decorativa: el estado lo anuncia el botón
   «Agotado». */
const EDGE =
  'M100 31.4 97.8 29.4 96.4 33.2 93.3 30.3 91.5 34.5 88.9 32.7 87.7 37.2 84.8 37.8 83.2 42.6 81 42.6 79.6 43 76.5 45.3 74.7 45.3 72.1 45.2 70.9 48.7 68 45.2 66.4 49.3 64.2 47.4 62.8 50.5 59.7 50.8 57.9 55.3 55.3 58.8 54.1 62.2 51.2 60 49.6 64.2 47.4 62.2 46 65.7 42.9 61.5 41.1 64.8 38.5 61.5 37.3 65.2 34.4 65.4 32.8 65.2 30.6 66.3 29.2 66 26.1 64.5 24.3 68.3 21.7 66.2 20.5 69.7 17.6 66.2 16 68.8 13.8 63 12.4 67.5 9.3 72.5 7.5 77.2 4.9 76.1 3.7 79 0.8 75.7 0 78.8';

export function TornSticker() {
  return (
    <span className="torn-sticker" aria-hidden="true">
      <svg
        className="torn-sticker-paper"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path d={`${EDGE}V100H100Z`} fill="var(--card)" />
        <path
          d={EDGE}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="torn-sticker-label">Agotado</span>
    </span>
  );
}

export default TornSticker;
