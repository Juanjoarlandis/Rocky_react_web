/* La mira de la foto de producto (idea 2 de dirección artística): el mismo
   dibujo que el cursor de diana, aro de tinta y marcas en el acento que lo
   tocan, con un halo del color de la tarjeta para que se lea sobre camisetas
   negras. Enmarca el estampado en vez de taparlo, y el trazo no crece con la
   foto (3 px de rotulador también en la ficha grande).

   Al añadir al carrito la mira se cierra y se va, y queda la pegatina del
   impacto: una mini-diana roja de tamaño fijo, fuera del SVG para que no
   escale con la foto. Cuándo aparece cada cosa y cómo se mueve está en
   components/product-media.css. Decorativa: los lectores de pantalla siguen
   leyendo el nombre de la foto. */
const RING =
  'M51.2 23.5c15.2-.7 26.7 11.1 26.2 27.2-.5 15.7-12.7 27-27.8 26.5-15.2-.5-26.5-12.3-26.2-27.7.3-14.5 11.8-25.5 28.7-26.2';
const TICKS = 'M50 8v13M50 79v13M8 50h13M79 50h13';

export function ProductReticle() {
  return (
    <>
      <svg className="product-reticle" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <g className="product-reticle-aim" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={RING} stroke="var(--card)" strokeWidth="7" vectorEffect="non-scaling-stroke" />
          <path d={TICKS} stroke="var(--card)" strokeWidth="7" vectorEffect="non-scaling-stroke" />
          <path d={RING} stroke="var(--ink)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          <path
            d={TICKS}
            stroke="var(--accent)"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="50" cy="50" r="1.6" fill="var(--ink)" />
        </g>
      </svg>
      <span className="product-reticle-hit" aria-hidden="true" />
    </>
  );
}

export default ProductReticle;
