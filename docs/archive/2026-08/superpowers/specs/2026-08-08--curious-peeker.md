# El Curioso itinerante

## Goal

Reutilizar la ilustración existente de El Curioso para que se asome brevemente
desde detrás de los bloques que ya hay en pantalla y dé la sensación de seguir
al visitante por la web sin interferir con la compra, la navegación o la
lectura.

## Non-goals

- No seguir literalmente el cursor ni mantener una animación continua.
- No añadir dependencias, imágenes nuevas, audio, controles ni preferencias.
- No cambiar las apariciones existentes de personajes ni el diseño de páginas.
- No mostrarlo durante el splash.

## Constraints

- La ilustración es decorativa, no recibe foco ni eventos de puntero.
- Sólo puede haber uno en pantalla a la vez, sea cual sea la pose.
- Cada pose se usa sólo en el canto para el que está dibujada, y siempre
  derecha: ninguna se gira. La de esquina sí se voltea en horizontal, que es
  para lo que se dibujó.
- Las apariciones duran unos tres segundos y quedan separadas por pausas
  largas y desiguales.
- `prefers-reduced-motion: reduce` desactiva la aparición completamente.
- Móvil usa una escala menor y espacia más las apariciones.
- No debe tapar la barra, el reproductor ni la caja de escribir del chat.

## Proposed approach

Un componente `CuriousPeeker` montado una sola vez desde `App`. Antes de cada
aparición recorre el DOM buscando escondites: bloques opacos y con canto
suficiente, visibles en ese momento. De cada uno usa el borde de arriba, y
añade el filo inferior de la propia pantalla como escondite comodín. Descarta
los que se solaparían con otro bloque o con los elementos flotantes, y elige
uno al azar dando más peso a los cercanos al centro de la mirada y evitando
repetir el anterior.

La caja del muñeco es la ventana por la que asoma: sus cantos interiores se
apoyan en los bordes del escondite, con `overflow: hidden`, de modo que al
deslizarse parece salir de detrás del elemento. Recortar ahí es lo mismo que
taparlo poniendo la tarjeta por delante con `z-index`, pero sin tener que
envolver cada tarjeta de la web en un contenedor de anclaje. Como las tarjetas
de ROCKY van giradas y con esquinas irregulares, el rectángulo del navegador
cae por fuera del trazo: se palpa el canto pintado real con `elementFromPoint`
en varios puntos y se muerde un par de píxeles para que no quede holgura.

Hay dos poses, cada una para su canto:

- **Arriba** (`asomado-borde`): se agarra al filo superior y saca la cabeza. El
  dibujo termina en su borde inferior, así que ese corte se apoya en el canto.
- **Esquina** (`cotilla-esquina`, lienzo de 620x820): se asoma por un lateral,
  apoyado en la base del bloque. La mano de dentro agarra el canto vertical en
  x = 360, y las piernas y los pies quedan detrás del bloque. De ahí salen las
  medidas: la franja que se ve es 360/620 del ancho, el alto es 820/620, y la
  esquina derecha es la misma pieza volteada. Se voltea la capa que mide justo
  lo que la ventana, no la imagen: así la línea de agarre pasa del canto derecho
  al izquierdo sola, sin tener que compensar los 260 px ocultos del lienzo.
  Pide que el bloque sea al menos tan alto como el dibujo y que haya sitio a su
  lado; donde no lo hay —la rejilla de producto, o el móvil— se queda con la
  pose de arriba.

En las esquinas de ROCKY el radio inferior es enorme (225 px de ancho por 15 de
alto), así que la base pintada llega a estar 15 px por encima del rectángulo: la
suela se coloca sobre lo que devuelve el palpado, no sobre el rectángulo, o el
muñeco quedaría colgado en el aire.

Las sombras cuentan como parte del bloque. En ROCKY son bloques de tinta duros
de 2 a 9 px desplazados abajo y a la derecha, y `elementFromPoint` no las ve, así
que se leen del `box-shadow` calculado: el canto por el que sale es el de fuera
de la sombra, y el bulto que no puede pisar es el rectángulo más su sombra. Sin
esto, en la esquina derecha el muñeco se dibujaba por encima de la sombra en vez
de salir de detrás de ella. Por la base no se aplica: ahí el muñeco ya está
fuera del bloque y no tiene sombra debajo.

Cuánto asoma cambia en cada aparición —sólo el gorro, gorro y ojos, o entero—
y a menudo se estira un poco más a mitad de la aparición antes de esconderse.
Mientras está fuera se recoloca en cada frame siguiendo a su escondite, así que
acompaña al scroll y se retira si el bloque se va de pantalla.

La animación va por gestos, cada uno con su tiempo y su curva. Salir y
estirarse usan muelles amortiguados muestreados a `linear()`, con reserva en
`cubic-bezier` bajo `@supports` para navegadores antiguos; el rebote se ajusta
para que nunca despegue las manos del canto. Esconderse usa una curva con
valores negativos al principio: es la anticipación, tira hacia arriba antes de
dejarse caer, sin necesidad de un temporizador extra. Al salir, un aplastado y
estirado de una sola pasada le da peso, y por eso la ventana lleva un 14% de
hueco por encima del dibujo. En reposo se superponen dos capas de duraciones no
múltiplas —vaivén sobre `rotate` y respiración sobre `translate`— con la fase y
el sentido sorteados en cada aparición, para que el bucle no se note.

## Affected areas

- `src/components/CuriousPeeker.jsx`
- `src/components/CuriousPeeker.test.jsx`
- `src/styles/CuriousPeeker.css`
- `src/App.jsx`
- `src/images/characters/cotilla-esquina.png` (original de ImageGen, 620x820)
- `src/images/optimized/characters/cotilla-esquina-460.webp` (el que se sirve)
- `docs/cotilla-esquina-preview.html` (demostración de la geometría)

## Acceptance criteria

- La primera aparición ocurre tras una pausa inicial.
- Cada aparición se oculta sola y la siguiente usa otro escondite si lo hay.
- Nunca hay dos en pantalla a la vez.
- Las manos quedan apoyadas en el canto del bloque, sin holgura ni corte
  visible sobre el bloque.
- En la esquina, la línea de agarre cae en el lateral pintado del bloque y la
  suela en su base pintada, en los dos lados.
- El componente no se renderiza durante el splash.
- Aparece en todas las vistas, incluidas el carrito y Rocky IA.
- La imagen es decorativa y no captura interacciones.
- Movimiento reducido elimina el componente visualmente.
- No existe desbordamiento horizontal en 390 px ni solapamiento con la Navbar,
  el reproductor o la caja de escribir del chat.

## Test strategy

- Vitest con temporizadores falsos y `Math.random` fijado: aparición, alturas
  de asomo, retirada, rotación de escondite y unicidad.
- Pruebas unitarias de la colocación sobre un canto y del mordido del borde.
- Pruebas de splash y de movimiento reducido.
- Build y suite completa del repositorio.
- Captura real en navegador a escritorio y 375 px antes del despliegue.
- Verificación de contenedor, origen privado y Cloudflare tras desplegar.

## Risks / rollout notes

- Una frecuencia alta sería molesta; se limita a apariciones breves y pausadas.
- El z-index queda debajo de Navbar y reproductor, y encima del contenido.
- El rollback conserva la release activa anterior y no modifica Cloudflare.

## Open questions

Ninguna. La dirección fue aprobada por el usuario el 2026-08-08 y ajustada el
2026-08-09: misma cara, bien pegado al canto, uno solo a la vez, más pequeño y
con alturas de asomo variables.
