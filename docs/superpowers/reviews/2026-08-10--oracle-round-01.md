# Rocky 035 — síntesis contrastada de Oracle, ronda 01

Fecha: 2026-08-10
Sesión padre: `rocky-visual-direction-round-one`
Estado: completada y contrastada; pendiente de seleccionar el primer bloque de implementación

## Dictamen

Rocky 035 ya posee una identidad visual propia y coherente. La dirección adecuada es conservar el papel crema, el trazo oscuro, el rojo y azul, las sombras impresas, los bordes imperfectos, las tipografías actuales y la relación física entre ilustraciones e interfaz. No se recomienda una modernización genérica ni una reescritura.

Oracle detectó dos problemas de severidad alta, ambos corregibles mediante cambios acotados:

1. El reproductor global carece de un contrato espacial y cubre contenido o acciones en varias rutas.
2. El detalle de producto cerca de 400 CSS px dedica el primer viewport a reserva ornamental e imagen, dejando fuera nombre, precio y acción de compra.

## Hallazgos aceptados y comprobados en el código

### Alta — contrato espacial del MiniPlayer

Evidencia: tienda a 820 y ≈400 px; Drops, Crew, Mi Crew y carrito a 500 px; producto a ≈400 px.

- `src/styles/MiniPlayer.css:2` declara `.mini-player` como `position: fixed`.
- `src/styles/MiniPlayer.css:6` le asigna `z-index: 2500`.
- No existe una reserva global equivalente en `App.jsx`, `App.css` o el contenido de las páginas.
- El chat solo eleva la capa con `.app--chat .mini-player` y la oculta a `max-width: 640px`; entre 641 y 720 px coexisten reglas de chat móvil y reproductor visible.
- El disco conserva una animación infinita y `MiniPlayer.css` no incluye una excepción de `prefers-reduced-motion`.

La corrección debe conservar la música global, pero darle una zona propia o una conducta explícita por anchura/ruta. Bajar el `z-index` únicamente cambiaría qué contenido queda oculto y no resuelve la causa.

### Alta — primer viewport móvil del detalle

Evidencia: `21-product-detail-mobile-css400-equivalent-125pct-safe.png`.

- En `ProductDetail.jsx`, `.detail-media-wrap` precede a `.detail-info` en el DOM.
- A `max-width: 768px`, `.detail-grid` se apila en una columna sin cambiar ese orden.
- `.detail-media-wrap` mantiene `margin-top: 96px`.
- `.detail-image` conserva `aspect-ratio: 1 / 1`.

La combinación explica que el primer viewport no muestre identidad comercial ni compra. El ajuste debe aplicarse a móvil y respetar la composición de escritorio y 820 px, que funciona correctamente.

### Media — anatomía de tarjetas de producto

- `.product-title` fuerza una sola línea con elipsis.
- `.product-actions` depende de wrapping flexible.
- El botón de compra está dentro de `.add-to-cart-control`, mientras la regla de flex solo se aplica directamente a `.product-actions .btn`; por ello el enlace Detalles puede ocupar una pista mucho mayor que el CTA primario.
- A `max-width: 640px` la cuadrícula sigue usando columnas mínimas de 160 px y las acciones se apilan.

Debe definirse una anatomía explícita, permitir hasta dos líneas de título estrecho y evitar que el CTA primario parezca subordinado.

### Media — zonas de seguridad de ilustraciones

- Carrito vacío de escritorio: `.cart-empty-illustration` se desplaza `46.6%` sobre la tarjeta y cruza el final del título.
- Studio móvil: `.studio-doodle` se ancla sobre el reproductor, pero no hay una regla móvil que proteja el subtítulo.
- Mi Crew móvil: la estrella global de `.page-title::before` queda 30 px fuera del borde derecho del título.

Las ilustraciones deben seguir apoyándose físicamente en la interfaz. La solución es reservar zonas de seguridad, no convertirlas en pegatinas aisladas ni reducir los objetos narrativos principales.

### Media — contraste textual

Comprobación local WCAG sobre los tokens actuales:

| Combinación | Ratio aproximado | Lectura |
| --- | ---: | --- |
| `--muted` / `--paper` | 4.22:1 | inferior a 4.5:1 para texto normal |
| `--accent` / `--paper` | 3.90:1 | inferior a 4.5:1 para texto normal |
| blanco / `--accent` | 4.17:1 | inferior a 4.5:1 para texto normal |
| `--accent-dark` / `--paper` | 4.96:1 | conforme para texto normal |
| `--ink-soft` / `--paper` | 10.63:1 | conforme |

La recomendación aceptada es separar roles decorativos de roles textuales. No se debe oscurecer indiscriminadamente toda la paleta.

### Media — movimiento reducido incompleto

El proyecto ya contempla `prefers-reduced-motion` en varias áreas, pero quedan excepciones comprobadas:

- disco de `MiniPlayer`;
- `.page-loading-spinner` global;
- `.setlist-spinner` de Studio;
- `scrollIntoView({ behavior: 'smooth' })` al abrir una tarjeta de Crew.

El feedback debe conservarse mediante iconos, texto, bordes, progreso o estado estático cuando el movimiento esté reducido.

### Media — semántica e interacción de tarjetas Crew

La tarjeta exterior usa `role="button"`, `tabIndex`, click y teclado, pero su reverso contiene un `Link` y un botón de compartir. El enlace detiene el click, mientras el botón de compartir depende de su manejador y del bubbling; además, el patrón semántico sigue siendo un botón que contiene otros controles.

Debe existir una acción de giro explícita o limitarse la activación del contenedor a eventos cuyo origen sea la propia tarjeta. Este hallazgo requiere una captura y prueba de teclado del reverso antes de implementarse.

### Baja — onboarding de Rocky IA

A ≈400 px el chat conserva el compositor y el scroll interno, por lo que no está roto. El primer prompt rápido queda fuera de la vista inicial. Un ajuste posterior puede reducir moderadamente la reserva ornamental sin convertir la bienvenida en una pantalla genérica.

## Correcciones de Oracle a las observaciones preliminares

- En la captura de chat a 820 px, el reproductor no tapa el textarea ni Enviar: el CSS reserva 172 px a la derecha del compositor. Sí fragmenta el borde inferior y consume espacio.
- El detalle a 820 px funciona en dos columnas. No hay evidencia para adelantar su breakpoint.
- La tarjeta de Mi Crew y el boombox de Studio deben seguir siendo protagonistas; no son exceso de densidad.
- En Studio móvil el defecto es el personaje sobre el subtítulo, no el tamaño del boombox.
- El chat a ≈400 px sigue siendo funcional; lo que pierde es la pista inicial de prompts.
- Las capturas 12, 13 y 14 existen localmente, pero no formaron parte del paquete de Oracle; no pueden citarse como evidencia de su dictamen.
- Las capturas actuales no prueban visualmente un fallo de navegación. El riesgo alrededor de 561/560 px se deduce del código y necesita recaptura completa del header.

## Evidencia que falta antes de decisiones posteriores

- Header completo en 820, 769/768, 721/720, 641/640, 561/560, 500, 400 nativo y 360 nativo.
- Navegación anónima/autenticada, carrito vacío/con contador y estado tras scroll.
- Capturas nativas de 400 y 360 CSS px; el zoom 125 % es una señal, no una prueba de cierre.
- Carrito con productos y warnings.
- Producto con variantes, agotado, error, confirmación y lightbox.
- Chat con conversación larga, carga, error, tarjetas de producto y teclado virtual.
- Crew reverso y recorrido por teclado.
- Mi Crew gate/loading/error/recompensa.
- Studio reproduciendo, setlist y BeatMachine.
- Grabación temporal en modo normal y `prefers-reduced-motion`.
- Foco, hover, touch, forced colors, loading global, 404 y categorías vacías.

## Primer bloque recomendado

El primer bloque recomendado es el contrato espacial del `MiniPlayer`. Es el único defecto de severidad alta que afecta simultáneamente a tienda, detalle, Drops, Crew, Mi Crew, carrito y chat; corregirlo primero permite evaluar después las composiciones reales sin la interferencia de una capa global.

Alcance propuesto del bloque:

- posición y reserva espacial;
- comportamiento responsive;
- integración específica con chat;
- ausencia en Studio sin hueco fantasma;
- reducción de movimiento del disco;
- ninguna modificación visual de las páginas subyacentes.

Recaptura mínima después de implementarlo:

- tienda: 1326, 820, 500 y 400 nativo;
- producto: 820, 500 y 400 nativo;
- Drops, Crew, Mi Crew y carrito: 500;
- Rocky IA: 1326, 820, 721, 720, 641, 640 y 400;
- Studio: 500 como control de no regresión.

## Decisión pendiente

No se ha implementado ningún cambio. La siguiente acción debe ser aprobar o ajustar el alcance del bloque MiniPlayer; después se diseñará la solución mínima, se probará y se presentará al mismo hilo de Oracle mediante `--followup rocky-visual-direction-round-one` con capturas antes/después y los archivos modificados.
