# Rocky 035 — bloque de navegación responsive

Fecha: 2026-08-10
Estado: implementación y verificación local completas; producción sin cambios

## Problema observado

Las capturas posteriores del MiniPlayer revelaron una regresión independiente en la navegación: entre 561 y 769 px el último tramo de la fila podía recortar `Mi Crew` y, en algunos anchos, ocultar también el carrito. A 769 px la medición previa mostraba que la cuenta tenía más contenido que ancho disponible.

## Corrección acotada

- Entre 721 y 800 px se conserva una sola fila, reduciendo únicamente padding y separación.
- A 720 px o menos la cabecera pasa a una composición estable de dos filas: marca arriba y destinos debajo.
- Todos los enlaces y controles conservan al menos 44 px de altura.
- El avatar autenticado conserva 44 × 44 px también en móvil.
- Marca, destinos, cuenta y carrito comparten un foco visible consistente con la identidad gráfica.
- No se modificaron rutas, autenticación, carrito, datos de Shopify ni producción.

Archivos del bloque:

1. `src/styles/NavBar.css`
2. `src/components/NavBar.test.jsx`

## Evidencia visual

Atlas confirmó el contrato a ambos lados del corte:

- 721, 768 y 769 px: una fila completa, sin truncar `Mi Crew` ni el carrito;
- 720, 641, 560 y 360 px: dos filas o wrap interno estable, con todos los destinos visibles;
- tienda y Rocky IA: el cambio no invade el contenido ni el compositor del chat.

Las 15 capturas posteriores y las referencias previas están catalogadas en `output/visual-audit/round-03-navigation/manifest.md`.

## Medición de navegador

La comprobación local de DOM registró:

| Viewport | Dirección | Ancho documento | `scrollWidth` | Resultado |
| --- | --- | ---: | ---: | --- |
| 769 × 900 | fila | 758 | 758 | todos los destinos dentro de 742 px; cuenta 60/60 px; carrito 44 px |
| 720 × 900 | columna | 709 | 709 | cabecera 107 px; fila de destinos 689 px; controles completos |
| 360 × 900 | columna | 349 | 349 | cabecera 153 px; destinos en dos líneas internas; controles completos |

La diferencia entre ancho de viewport y documento corresponde a la barra de desplazamiento vertical; en los tres casos `clientWidth === scrollWidth`, por lo que no existe overflow horizontal.

## Pruebas

La prueba de contrato CSS cubre el intervalo compacto, el corte exacto a 720 px, la ausencia del breakpoint anterior de 560 px y las dimensiones táctiles mínimas, incluido el avatar autenticado.

Riesgo restante: las capturas se hicieron mediante emulación responsive de DevTools en Atlas. Antes de producción sigue siendo recomendable repetir el bloque en hardware móvil real para safe areas, zoom del navegador y teclado virtual.
