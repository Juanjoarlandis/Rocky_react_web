# Rocky 035 — contrato MiniPlayer, Oracle ronda 02

Fecha: 2026-08-10
Sesión padre: `rocky-visual-direction-round-one`
Seguimiento: `rocky-miniplayer-contract-plan`
Estado: Oracle completado; contrato contrastado con el código; evidencia `before` completa; pendiente de autorización para implementar

## Resultado

Oracle emitió un `GO` claro y acotado para el primer bloque de implementación. La decisión artística y técnica es:

> Dock propio, nunca overlay.

El MiniPlayer conserva su identidad —píldora, título, vínculo con Estudio, disco y play/pause—, pero deja de ser una capa fija sobre la interfaz. Cada contexto pasa a ser propietario de un espacio explícito:

- rutas de tienda y contenido: dock en flujo normal inmediatamente después de `NavBar` y antes de `.app-main`;
- `/rockyIA`: dock local dentro de `.chat-header`;
- `/estudio`: no se monta el MiniPlayer ni su slot, porque el boombox lo sustituye;
- a `640px` o menos: variante compacta que mantiene título y reproducción, nunca `display: none`.

La navegación recortada alrededor de 561/560 px es un defecto real e independiente. Se tratará en el bloque inmediato posterior, sin mezclar `NavBar.jsx` o `NavBar.css` con esta implementación.

## Evidencia visual nueva

La ronda 02 añadió 14 capturas aceptadas de Atlas con layouts CSS exactos y altura de 900 px:

- Rocky IA: 721, 720, 641, 640, 561, 560, 500, 400 y 360 px;
- tienda: 561, 560, 500, 400 y 360 px.

Hallazgos que cierran la decisión:

1. En Rocky IA el player está presente a 641 px y desaparece a 640 px.
2. El chat cambia de composición a 720 px, mientras el player flotante continúa hasta 641 px y fragmenta visualmente el área de trabajo.
3. La navegación queda recortada a 561 px y pasa a dos filas completas a 560 px.
4. En tienda el player fijo invade territorio de tarjetas y acciones en 561, 560, 500, 400 y 360 px; a 360 px ocupa directamente la tarjeta principal.
5. No existe una esquina fija que permanezca segura en rutas y estados distintos.

El manifiesto y las imágenes están en `output/visual-audit/round-02-responsive-contract/`. Los archivos de trabajo terminados en `-atlas-window.jpeg` se excluyeron del paquete de Oracle; solo se adjuntaron recortes de página inspeccionados.

## Contrato por contexto

### Tienda y otras rutas de contenido

- Más de 720 px: dock estándar en flujo, alineado a la derecha dentro del gutter del shell.
- De 641 a 720 px: dock compacto en el mismo slot, con título truncable y controles de al menos 44 px.
- Hasta 640 px: dock móvil compacto, ancho limitado al espacio disponible, play/pause de 48 px cuando sea posible y nunca menos de 44 px.
- El player deja deliberadamente de persistir al desplazarse por la página.

### Rocky IA

- Más de 720 px: player dentro del extremo derecho de la cabecera, con reserva aproximada de 208 px.
- De 641 a 720 px: variante compacta de cabecera, con reserva aproximada de 152–160 px.
- Hasta 640 px: variante `radio-tab`, sin disco, con título corto y play/pause dentro de una reserva aproximada de 120 px.
- El compositor deja de reservar 172 px para defenderse de un player externo.

### Estudio

- Cero instancias de MiniPlayer.
- Cero slots vacíos.
- El boombox conserva la responsabilidad de título, estado y reproducción.

## Contraste con el código actual

La propuesta encaja en la arquitectura existente y corrige responsabilidades concretas:

- `src/App.jsx` monta hoy una instancia global de `MiniPlayer` después del footer. `App` ya conoce `location.pathname` y puede decidir entre contenido, chat o Estudio sin añadir una abstracción nueva.
- `src/components/MiniPlayer.jsx` usa hoy `useLocation` para ocultarse en Estudio. Esa decisión de ruta debe subir a `App`; el componente queda presentacional y recibe su variante.
- `src/styles/MiniPlayer.css` declara actualmente `position: fixed`, `right`, `bottom`, `z-index: 2500`, una elevación para chat y `display: none` en chat hasta 640 px. Son precisamente las reglas que deben desaparecer.
- `src/components/ChatComponent.jsx` ya posee una cabecera semántica clara donde puede recibir un slot explícito sin cambiar su lógica conversacional.
- `src/styles/ChatComponent.css` reserva actualmente `padding-right: 200px` en cabecera y `padding-right: 172px` en compositor para convivir con la capa fija. La nueva propiedad espacial permite mantener la reserva solo donde vive el player.
- `src/App.css` ya expresa que el chat es una pantalla de viewport completo y que `.app-main` es su columna flexible; no hace falta reescribir el shell.

No es necesario tocar ProductPage, ProductDetail, Cart, Drops, Crew, Mi Crew, NavBar, `MusicContext` ni dependencias en este bloque.

## Archivos mínimos autorizables

1. `src/App.jsx`
2. `src/components/MiniPlayer.jsx`
3. `src/styles/MiniPlayer.css`
4. `src/components/ChatComponent.jsx`
5. `src/styles/ChatComponent.css`

Selectores nuevos mínimos previstos:

- `.mini-player-slot`
- `.mini-player-slot--content`
- `.mini-player--chat`
- `.mini-player--compact`
- `.mini-player--radio-tab`
- `.chat-header-player`

Regla de propiedad:

- `App.jsx` decide existencia y slot;
- `MiniPlayer.css` decide apariencia y tamaño;
- `ChatComponent.css` reserva el espacio de la cabecera;
- ninguna página subyacente añade padding defensivo.

## Orden de implementación aprobado por Oracle

1. Transferir la propiedad de ruta a `App` y garantizar como máximo una instancia.
2. Convertir `MiniPlayer` en un componente presentacional con variantes y grupo accesible.
3. Crear el dock de contenido bajo la navegación, en flujo normal.
4. Insertar el dock de chat en la cabecera y retirar la reserva artificial del compositor.
5. Verificar teclado, touch, movimiento reducido, una sola instancia, Studio sin hueco y regresión visual.

## Criterios de aceptación esenciales

- En contenido, la posición computada del player no es `fixed`, `sticky` ni `absolute`.
- El player queda dentro de su slot y no intersecta `.app-main`.
- En chat, el player queda dentro de `.chat-header` y su intersección con mensajes y compositor es cero.
- Hay una instancia en rutas compatibles y ninguna instancia ni hueco en Estudio.
- No aparece scroll horizontal a 360 px.
- `BARRO` se ve; un título largo se trunca visualmente, pero conserva su nombre accesible completo.
- El orden de teclado interno es título y después play/pause; ambas acciones siguen separadas.
- Ningún objetivo táctil mide menos de 44×44 CSS px.
- `prefers-reduced-motion` detiene el disco y las traslaciones/rotaciones animadas sin ocultar el estado.
- Ningún producto, precio, selector, CTA, mensaje o compositor queda tapado.

## Regresión más probable

El riesgo principal es añadir un wrapper en flujo pero conservar `position: fixed`, o dejar simultáneamente la instancia global y la de chat. Esto produciría un hueco vacío, dos controles sobre el mismo `MusicContext` o una instancia enfocada fuera de pantalla. La verificación debe medir la posición computada y contar las instancias en cada ruta.

No son soluciones válidas bajar el `z-index`, ocultar el player en todo móvil o añadir padding a cada página: ninguna de ellas crea un propietario espacial y todas trasladan o esconden el defecto.

## Recaptura obligatoria

Se repetirán las 14 capturas de esta ronda después del cambio. Antes de editar se completarán además:

- tienda a 721, 720, 641, 640, 1326 y 820 px;
- tienda a mitad de catálogo a 820 y 360 px;
- Rocky IA con interacción real a 641 y 360 px.

La regresión posterior abarcará producto, carrito vacío, Drops, Crew, Mi Crew autenticada, Estudio y 404 en los tamaños indicados por la respuesta completa de Oracle.

La evidencia adicional ya está completa y validada en `output/visual-audit/round-02-responsive-contract/before-extra/`. Su manifiesto identifica diez recortes finales: tienda en 721, 720, 641, 640, 1326 y 820 px; mitad de catálogo en 820 y 360 px; y Rocky IA con una respuesta real visible en 641 y 360 px. Los originales que conservan la interfaz de Atlas están expresamente excluidos de los bundles de Oracle.

La regresión amplia previa también está completa en `output/visual-audit/round-02-responsive-contract/before-routes/`: nueve estados a 360 × 900 para producto, carrito vacío, Drops, Crew anverso y reverso, Mi Crew antes y después de recuperar la sesión de Shopify, Estudio y 404. Estudio confirma la referencia positiva: su reproductor en flujo no tapa contenido; las demás rutas repiten la interferencia del MiniPlayer fijo en mayor o menor grado.

## Trazabilidad de Oracle

- Ambas sesiones apuntan a la misma conversación de ChatGPT: `6a79c12a-7130-83eb-9262-64d6328bc8fa`.
- El seguimiento se lanzó con `--followup rocky-visual-direction-round-one`.
- Motor: navegador; modelo efectivo: `gpt-5-pro`.
- La sesión padre verificó el selector `Pro` (`resolved=Pro`, `verified=yes`).
- El seguimiento reutilizó la conversación y no reabrió el selector; por eso su metadata local indica selección `skipped` y `verified=no`, sin advertencias. Esta es una limitación de verificación del seguimiento, no evidencia de cambio de conversación o de modelo efectivo.
- Duración: 26m37s.
- Uso: 24,861 tokens de entrada y 5,824 de salida.
- Transcripción: validación `ok`, 28,431 bytes.
- El archivo de respuesta completo es `output/visual-audit/round-02-responsive-contract/oracle-round-02-response.md`.

## Próxima decisión

No se ha modificado código de aplicación. El siguiente paso requiere autorización del usuario para implementar únicamente este bloque MiniPlayer. Después se ejecutarán las comprobaciones del repositorio, se recapturará el mismo conjunto en Atlas y el resultado se devolverá a esta misma conversación de Oracle para la crítica antes/después.
