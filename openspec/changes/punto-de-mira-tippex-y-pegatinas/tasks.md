# Tareas: punto de mira, rotulador y Tipp-Ex, y pegatina arrancada

Nivel 2 con decisiones de producto: no se implementa hasta que el usuario apruebe el
prototipo. TDD en cada tarea: prueba en rojo, implementación mínima, refactor en verde.

## 0. Aprobación

- [x] 0.1 Prototipo `docs/design/punto-de-mira-tippex-pegatina-preview.html` con los tres gestos, de día y de noche; capturas y vídeo para el usuario.
- [ ] 0.2 Aprobación del usuario (y ajustes del prototipo si los pide).

## 1. Punto de mira

- [ ] 1.1 Pruebas: la foto de tarjeta y de ficha contiene la retícula oculta a lectores; el nombre accesible no cambia. Rojo, después `Reticle` y su CSS.
- [ ] 1.2 Pruebas del impacto: con `btn--added` la tarjeta (y solo esa) estampa el punto; con un añadido fallido, no. Contrato CSS `:has(.btn--added)` comprobado en la hoja. Rojo, después implementación.

## 2. Rotulador y Tipp-Ex

- [ ] 2.1 Pruebas de `Descontrol`: al encender, el rótulo contiene los trazos y dura lo mismo (sigue avisando a los 1,4 s); al apagar se monta el corrector y se desmonta a los 0,7 s; volver a encender a mitad lo quita; con movimiento reducido no hay capas. Rojo, después implementación.

## 3. Pegatina arrancada

- [ ] 3.1 Pruebas de `ProductPage`: un producto con la variante no disponible en modo Shopify lleva `is-sold-out` y el papel roto decorativo, y su foto sigue abriendo el lightbox; uno disponible, no. Rojo, después `TornSticker` y su CSS.

## 4. Verificación y cierre

- [ ] 4.1 Verificación en Chrome: capturas de día y de noche a 375 y 1280 px; la transición medida a 4× de CPU; teclado y movimiento reducido.
- [ ] 4.2 `npm run check` en verde.
- [ ] 4.3 Revisión independiente (`engineering-review`) y corrección de bloqueantes.
- [ ] 4.4 Commits en la rama `arte/punto-de-mira-tippex-y-pegatinas` y push; publicar en producción solo si el usuario lo pide.
