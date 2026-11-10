# Tasks

Nivel 2. TDD en cada tarea con lógica: prueba en rojo, implementación mínima y refactor en verde. Lo que es solo CSS se comprueba con capturas y medidas en navegador real (Playwright, fuera del repo). Antes de empezar, línea base de `npm run test:run`.

## 1. Bloque A — fallos

- [x] 1.1 `paint.js`: `pintadas()` (D1) y `posicionesDeFirmas(strokes, centerX, anchoPagina)` como lista alineada a la derecha y acotada a la página (D2); `firmaEn` sobre pintadas. Verifica: pruebas de dos sitios, trazos juntos, borde derecho, borde izquierdo, mismo sitio, 2000 pintadas y hueco entre dos pintadas de la misma firma. Las pruebas de la colocación antigua se reescriben para el requisito nuevo.
- [x] 1.2 `Spray.jsx`: usar la lista nueva y pasar el ancho de la página. Verifica: las pruebas del spray siguen verdes.
- [x] 1.3 Barra del spray en rejilla (D5): `.spray-fila` en el JSX y `spray.css`. Verifica: medida en navegador — ancho ≤ 720 px a 1440 y alto ≤ 1/3 de la ventana a 375×812 con la lista abierta.
- [x] 1.4 El Taller (D11): botones de la casa en las secciones y rótulos en mayúsculas. Verifica: prueba de que las secciones no usan la clase de la mesa y captura de `/taller` sin pasar por el Estudio.
- [x] 1.5 Fecha única en la página del drop (D12). Verifica: prueba de que la hoja en `cabecera` dice la fecha una vez y en el muro también.

## 2. Bloque B — la mesa

- [x] 2.1 Distribución en una pantalla (D7) en `beat-machine.css`. Verifica: medida en navegador — la mesa mide ≤ 832 px de alto a 1440×900 y todo queda dentro de la ventana; cada pad ≥ 80 px de alto; a 1366×768, 900 y 375 no hay solapes ni desborde horizontal.
- [x] 2.2 Consola de máquina (D8): `cinta` en `TRACKS`, marcado del canal y estilos. Verifica: prueba de datos (`cinta` en las 8 pistas) y de que la consola rotula cada canal y conserva nombres accesibles; captura.
- [x] 2.3 Leyendas serigrafiadas. Verifica: medida en navegador — las cinco leyendas comparten familia, tamaño y color.
- [x] 2.4 Neón propio de la mesa (D9). Verifica: medida en navegador — con el neón encendido el color de la pantalla y del play no es el ámbar; contraste del texto de la pantalla ≥ 4,5:1; captura de día sin cambios de color.
- [x] 2.7 «Compartir beat» visible como botón sobre el chasis (añadido al cambio durante el bloque B: salió en la revisión visual como detalle y no estaba en la lista). Verifica: captura del pie de día y en neón.
- [x] 2.5 `estadosDelPublico()` (D10) con sus pruebas: silenciada, solo, pista vacía, mesa parada, ocho pistas y siete.
- [x] 2.6 `Publico.jsx` y El Freeze: clases de estado, zetas, foco, truco y escalonado; movimiento reducido. Verifica: pruebas de clases por escenario; captura con caja silenciada, con solo y con las ocho.

## 3. Bloque C — la pared como pieza

- [x] 3.1 `manoDe()` y `drawTag` con inclinación y remate (D3). Verifica: pruebas — misma firma misma mano, inclinación ≤ 8°, el texto se escribe con el color del autor.
- [x] 3.2 Botes en el grupo de colores (D6) y `rattle.js`. Verifica: pruebas — tres opciones con nombre, la elegida marcada, sin audio no falla, el mismo bote no suena; captura.
- [x] 3.3 Destacar una firma en la web (D4). Verifica: prueba de `paint.js` del atenuado y repintado; prueba del componente con foco y con salida de la lista; captura.
- [x] 3.4 Destacar una firma en El Taller (D4). Verifica: prueba con foco en la fila; captura.

## 4. Bloque D — cartel y muro

- [x] 4.1 Nota «arranca una» (D12). Verifica: pruebas — está antes de arrancar, es decorativa y desaparece al arrancar.
- [x] 4.2 Resguardo y sello (D12): `onApuntado` en `DropAviso`. Verifica: pruebas — arrancar, apuntarse, ya apuntado y envío fallido.
- [x] 4.3 Restos del muro (D13). Verifica: pruebas — capa decorativa fuera del lector y sin foco, ausente con el muro vacío; medida en navegador — sin desplazamiento horizontal a 375 y carteles por encima.

Retirada la tarea 4.4 (jirones del cartel que voló): el hallazgo era un fallo de captura, ver `proposal.md`.

## 5. Cierre

- [x] 5.1 `npm run check` en verde.
- [x] 5.2 Capturas finales de cada bloque a 375, 1440 y 1920, de día y en neón, y medidas de los criterios de aceptación.
- [x] 5.3 Revisión independiente (skill `engineering-review`) y corrección de lo que encuentre.
- [x] 5.4 Informe de cierre con las pruebas reescritas y lo que queda como comprobación manual.
