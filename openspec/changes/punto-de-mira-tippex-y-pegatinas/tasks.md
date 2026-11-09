# Tareas: punto de mira, rotulador y Tipp-Ex, y pegatina arrancada

Nivel 2 con decisiones de producto: no se implementa hasta que el usuario apruebe el
prototipo. TDD en cada tarea: prueba en rojo, implementación mínima, refactor en verde.

## 0. Aprobación

- [x] 0.1 Prototipo `docs/design/punto-de-mira-tippex-pegatina-preview.html` con los tres gestos, de día y de noche; capturas y vídeo para el usuario.
- [x] 0.2 Aprobación del usuario (y ajustes del prototipo si los pide).

## 1. Punto de mira

- [x] 1.1 Pruebas: la foto de tarjeta y de ficha contiene la retícula oculta a lectores; el nombre accesible no cambia. Rojo, después `Reticle` y su CSS.
- [x] 1.2 Pruebas del impacto: con `btn--added` la tarjeta (y solo esa) estampa el punto; con un añadido fallido, no. Contrato CSS `:has(.btn--added)` comprobado en la hoja. Rojo, después implementación.

## 2. Rotulador y Tipp-Ex

- [x] 2.1 Pruebas de `Descontrol`: al encender, el rótulo contiene los trazos y dura lo mismo (el aviso para ir a la portada pasó a los 450 ms por decisión del usuario); al apagar se monta el corrector y se desmonta a los 0,7 s; volver a encender a mitad lo quita; con movimiento reducido no hay capas. Rojo, después implementación.

## 3. Pegatina arrancada

- [x] 3.1 Pruebas de `ProductPage`: un producto con la variante no disponible en modo Shopify lleva `is-sold-out` y el papel roto decorativo, y su foto sigue abriendo el lightbox; uno disponible, no. Rojo, después `TornSticker` y su CSS.

## 5. Revisiones independientes

- [x] 5.1 Revisión de código, ronda 1: bloqueante de movimiento reducido corregido (transiciones solo en `no-preference`, con prueba y comprobación en Chrome); menores 3 y 6 corregidos.
- [x] 5.2 Revisión de arte, ronda 1: B1–B3 e I1–I10 corregidos, con pruebas en rojo antes de cada corrección. I11, navegar bajo la tinta, lo decidió el usuario el 2026-11-09 viendo las dos tiras comparadas.
- [x] 5.3 Ronda 2 de las dos revisiones, limitada a las correcciones.
  - Arte: aprobado. Los dos menores nuevos se corrigieron: el rótulo se retira antes y la variante del desgarro va por producto.
  - Código: sin bloqueantes. Se corrigieron I1–I4 y M1–M3:
    - el rótulo, más pequeño que el título;
    - el anillo de foco, como `::after` encima del papel;
    - el trazo, como mucho al 40 % del lado corto;
    - la ficha de un agotado, sin mira;
    - el escenario de apagar con la tinta ya puesta;
    - el filo de tinta del corrector.
  - M4 queda como riesgo (máscara animada en Safari, sin probar; si falla, solo falta el Tipp-Ex).

## 4. Verificación y cierre

- [x] 4.1 Verificación en Chrome: capturas de día y de noche a 375 y 1280 px; la transición medida a 4× de CPU; teclado y movimiento reducido.
- [x] 4.2 `npm run check` en verde (107 ficheros, 853 pruebas, lint, stylelint, build y escaneo de secretos).
- [x] 4.3 Revisión independiente (`engineering-review`) y corrección de bloqueantes.
- [ ] 4.4 Commits en la rama `arte/punto-de-mira-tippex-y-pegatinas` y push; publicar en producción solo si el usuario lo pide.
