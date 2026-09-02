# Rocky 035 — protocolo iterativo de dirección artística

Fecha: 2026-08-10
Estado: MiniPlayer, navegación responsive, primer viewport del detalle, anatomía de tarjetas y dos excepciones de movimiento reducido implementados y verificados en local; Oracle no recibió la revisión posterior por un fallo reproducible de envío; producción sin cambios
Sitio observado: `https://rocky035.com`
Repositorio: `Rocky_react_web`
Commit de partida: `766e6ee6b325132b9aa1956508efe9b3399ae983`

## Objetivo

Revisar y mejorar Rocky 035 de forma iterativa, usando capturas reales de la web en Atlas y revisiones independientes de Oracle en modo navegador con inteligencia Pro. Cada recomendación debe quedar vinculada a evidencia visual y a los componentes o estilos que habría que modificar.

El resultado buscado no es sustituir la identidad de Rocky 035. Es reforzar su claridad, jerarquía, ritmo, adaptación responsive, accesibilidad, interacción y calidad de implementación sin perder su lenguaje ilustrado, artesanal y musical.

## Principios de trabajo

1. Capturar antes de opinar o editar.
2. Usar solo Atlas para observar la web real, porque es el navegador elegido y contiene la sesión autorizada de Shopify.
3. Recortar toda interfaz del navegador antes de compartir capturas con Oracle.
4. No adjuntar cookies, perfiles de navegador, credenciales, archivos `.env`, datos de sesión ni información personal innecesaria.
5. Ejecutar Oracle exclusivamente con `--engine browser --model gpt-5-pro`, que selecciona la inteligencia Pro vigente de ChatGPT; no usar API ni modelos Sol.
6. Tratar a Oracle como director artístico y revisor independiente, no como ejecutor ni autoridad infalible. Cada hallazgo se contrastará con el código y con una nueva captura.
7. Trabajar en bloques pequeños. Ninguna recomendación visual se implementará hasta convertirla en una tarea delimitada y aceptar su alcance.
8. Preservar los cambios locales del usuario y evitar dependencias, migraciones o cambios de producción salvo aprobación explícita.
9. Mantener las rondas posteriores dentro de la misma conversación de Oracle. El hilo padre es `rocky-visual-direction-round-one`; cada seguimiento debe usar `--followup rocky-visual-direction-round-one` y adjuntar solo el código y la evidencia actualizados necesarios para esa ronda.

## Registro de Oracle — ronda 01

- Oracle review: `completed`.
- Checkpoint: línea base y plan de dirección artística.
- Sesión padre: `rocky-visual-direction-round-one`.
- Motor: navegador.
- Modelo solicitado: `gpt-5-pro`, selector de inteligencia Pro.
- Evidencia de modelo: requested `Pro`, resolved `Pro`, `verified=yes`.
- Duración: `39m52s`.
- Entrada/salida: aproximadamente `63.19k` / `9.01k` tokens.
- Resultado: cambios necesarios; dos hallazgos de severidad alta.
- Respuesta guardada: `output/visual-audit/round-01-baseline/oracle-round-01-response.md`.
- Transcripción durable de Oracle: `~/.oracle/sessions/rocky-visual-direction-round-one/artifacts/transcript.md`, validación `ok`.
- Síntesis contrastada: `docs/superpowers/reviews/2026-08-10--oracle-round-01.md`.

La conversación de Oracle no se archivó para poder continuarla. Antes de cualquier follow-up se debe comprobar que la sesión padre está completa, usar su ID exacto y adjuntar evidencia fresca; no se debe iniciar otra consulta que pierda el contexto acumulado.

## Registro de Oracle — ronda 02

- Oracle review: `completed`.
- Checkpoint: contrato espacial y responsive del MiniPlayer.
- Sesión de seguimiento: `rocky-miniplayer-contract-plan`.
- Sesión padre: `rocky-visual-direction-round-one`.
- Conversación ChatGPT compartida por ambas sesiones: `6a79c12a-7130-83eb-9262-64d6328bc8fa`.
- Motor: navegador.
- Modelo efectivo: `gpt-5-pro`.
- Evidencia de modelo: la sesión padre verificó `requested=Pro`, `resolved=Pro`, `verified=yes`; el seguimiento reutilizó esa conversación y omitió volver a abrir el selector, por lo que su registro local figura como `status=skipped`, `verified=no` sin advertencias.
- Duración: `26m37s`.
- Entrada/salida: `24.86k` / `5.82k` tokens.
- Resultado: `GO` limitado al bloque MiniPlayer; navegación y detalle móvil permanecen como bloques independientes.
- Respuesta guardada: `output/visual-audit/round-02-responsive-contract/oracle-round-02-response.md`.
- Transcripción durable de Oracle: `~/.oracle/sessions/rocky-miniplayer-contract-plan/artifacts/transcript.md`, validación `ok`.
- Síntesis contrastada: `docs/superpowers/reviews/2026-08-10--oracle-round-02-miniplayer-contract.md`.

La decisión es un dock propio, nunca un overlay: en rutas de contenido el reproductor vive en flujo normal bajo la navegación; en Rocky IA vive dentro de la cabecera del chat; en Estudio no se monta ni deja hueco. A 640 px o menos se compacta, pero no desaparece.

## Cobertura del producto

### Rutas y estados

| Área | Ruta o estado | Implementación principal |
| --- | --- | --- |
| Tienda | `/` | `ProductPage.jsx`, `ProductPage.css` |
| Categoría | `/products/:category` | `ProductPage.jsx`, `ProductPage.css` |
| Drops | `/menudrop` | `MenuDrop.jsx`, `MenuDrop.css` |
| Producto | `/product/:productId` | `ProductDetail.jsx`, `ProductDetail.css` |
| Carrito | `/cart`, vacío y con artículos | `Cart.jsx`, `Cart.css` |
| Rocky IA | `/rockyIA`, bienvenida, conversación, carga y error | `ChatComponent.jsx`, `ChatComponent.css` |
| Estudio | `/estudio` | `Studio.jsx`, `BeatMachine.jsx`, `Studio.css`, `BeatMachine.css` |
| Crew | `/crew`, anverso y reverso de cromos | `Crew.jsx`, `Crew.css` |
| Mi Crew | `/mi-crew`, acceso y sesión autenticada | `CrewProfile.jsx`, `CrewProfile.css` |
| Global | navegación, pie, reproductor, carga, 404 | `App.jsx`, `App.css`, `index.css`, `NavBar`, `Footer`, `MiniPlayer`, `NotFound` |

### Tamaños de referencia

- Escritorio: viewport visible de Atlas de aproximadamente `1326 × 796` CSS px una vez retirada la interfaz del navegador.
- Tableta: aproximadamente `820 × 738` CSS px.
- Móvil ancho de línea base: aproximadamente `500 × 674` CSS px mediante ventana normal de Atlas.
- Bordes responsive exactos de ronda 02: `721`, `720`, `641`, `640`, `561`, `560`, `500`, `400` y `360` CSS px de anchura, todos con `900` CSS px de altura, obtenidos mediante la emulación responsive de DevTools dentro de Atlas.
- Las capturas finales de ronda 02 son recortes exclusivos de la página y conservan el layout CSS exacto indicado en el nombre; el raster se reescaló tras retirar la interfaz de Atlas.
- En rondas posteriores se añadirán estados por debajo del primer viewport y pruebas de interacción; la ronda 01 fija primero la línea base de entrada de cada ruta.

## Rondas

### Ronda 01 — línea base y dirección artística

- Inventariar rutas, componentes, estilos y breakpoints.
- Capturar la entrada de cada ruta en escritorio y las rutas críticas en tableta/móvil.
- Generar copias seguras sin interfaz de Atlas.
- Vincular cada imagen con su ruta y código en un manifiesto.
- Solicitar a Oracle hallazgos priorizados por severidad, referencias a capturas y referencias concretas a archivos/selectores.
- Contrastar el dictamen con el código y convertirlo en bloques de trabajo pequeños.

### Ronda 02 — shell, tienda y conversión

- Checkpoint 02A completado: fronteras responsive de chat y tienda y contrato espacial del MiniPlayer.
- Evidencia previa adicional completada: seis entradas de tienda, dos estados de mitad de catálogo y dos estados de conversación real, documentados en `output/visual-audit/round-02-responsive-contract/before-extra/manifest.md`.
- Regresión móvil previa completada: producto, carrito vacío, Drops, Crew anverso/reverso, Mi Crew acceso/autenticada, Estudio y 404 a 360 × 900, documentados en `output/visual-audit/round-02-responsive-contract/before-routes/manifest.md`.
- MiniPlayer implementado conforme al contrato de Oracle, con 39 capturas posteriores de Atlas y pruebas de integración; revisión registrada en `docs/superpowers/reviews/2026-08-10--oracle-round-03-miniplayer-implementation.md`.
- Navegación responsive implementada como bloque independiente: fila única compacta entre 721 y 800 px, composición estable de dos filas a 720 px o menos, destinos completos, foco visible y objetivos táctiles de 44 px.
- Evidencia de navegación: 15 capturas posteriores de Atlas y mediciones de DOM a 769, 720 y 360 px en `output/visual-audit/round-03-navigation/manifest.md`.
- Detalle de producto implementado como bloque independiente: en móvil la identidad, la descripción y los controles de compra preceden a la galería en orden visual, de DOM y de teclado; escritorio conserva la composición de dos columnas.
- Evidencia del detalle: cinco capturas posteriores de Atlas en 360, 400, 768, 769 y 820 px, además de mediciones de DOM, en `output/visual-audit/round-04-product-detail/manifest.md`.
- Anatomía de tarjetas implementada como bloque independiente: títulos de dos líneas con altura estable, CTA primario con la pista dominante en filas, apilado móvil explícito y acciones táctiles de al menos 44 px.
- Evidencia de tarjetas: auditoría fresca y siete capturas antes/después de Atlas en 360, 400, 820 y 1326 px, además de mediciones de DOM, en `output/visual-audit/round-05-product-cards/manifest.md`.
- Movimiento reducido, subbloque de spinners: el indicador global de carga y el indicador de pista activa de Estudio permanecen visibles pero dejan de rotar con `prefers-reduced-motion: reduce`; revisión en `docs/superpowers/reviews/2026-08-10--reduced-motion-spinners.md`.
- Producción autorizada y completada el 2026-08-10: release `/opt/rocky035/releases/20260810T204719Z-766e6ee-visual-r1`, imagen `rocky035:<tag-imagen>` y digest `sha256:<digest>`. La imagen repitió 234 tests y el build ARM64 antes de activarse; origen privado, apex, `www`, rutas principales, capacidades Shopify, caché Cloudflare, CSP, rechazo de origen no confiable y reinicio controlado pasaron. La release inmediata anterior `20260809T221221Z-766e6ee-oauth` permanece como rollback.
- QA visual de producción: portada a 1440 y 390 px y detalle de producto a 390 px, sin errores de consola ni scroll horizontal navegable. En el detalle móvil, identidad y compra aparecen antes de la galería dentro del primer viewport. Las capturas están en `output/playwright/production-2026-08-10/`. La pestaña previamente autenticada de Atlas redirigió a portada al recargar porque su sesión ya no estaba vigente; no se afirma una revisión autenticada posterior al despliegue.
- Siguiente bloque: carrito vacío/con artículos y checkout handoff; cualquier mutación de Shopify requiere una ronda de prueba controlada y autorización separada.

### Ronda 03 — páginas narrativas y membresía

- Drops, Estudio, Crew y Mi Crew.
- Jerarquía, densidad, continuidad narrativa y composición por breakpoint.
- Estados interactivos: cromos, audio, acceso, recompensas y contenido largo.

### Ronda 04 — Rocky IA, movimiento y accesibilidad

- Bienvenida, conversación, carga, error y productos sugeridos.
- Teclado, foco, tamaños táctiles, contraste y lectura.
- Microinteracciones y animaciones con propósito.
- Respeto a `prefers-reduced-motion` y ausencia de movimiento que oculte acciones.

### Ronda 05 — pulido y regresión visual

- Comparar antes/después con el mismo viewport y estado.
- Revisar coherencia entre rutas y bordes de breakpoint.
- Ejecutar una revisión final de Oracle sobre evidencia actualizada.
- Cerrar solo cuando no queden defectos visuales de severidad alta y los riesgos restantes estén documentados.

## Formato obligatorio de los hallazgos

Cada hallazgo aceptado debe indicar:

- severidad (`alta`, `media` o `baja`);
- captura, viewport y ruta donde se observa;
- síntoma visible y efecto sobre la experiencia;
- archivo, componente y selector probable;
- corrección mínima propuesta;
- criterios de aceptación visual y funcional;
- riesgo de regresión y vistas que deben volver a capturarse.

## Criterios de aceptación por bloque

Un bloque se considera terminado únicamente si:

1. existe una captura anterior y una posterior del mismo estado y viewport;
2. la diferencia se revisó visualmente, no solo mediante tests;
3. las interacciones principales siguen funcionando;
4. el cambio mantiene la identidad de marca y no introduce una nueva estética incompatible;
5. pasan las comprobaciones relevantes del repositorio;
6. Oracle se usa en el punto de mayor valor del bloque cuando la decisión sea no trivial o arriesgada;
7. los riesgos restantes quedan anotados.

## Fuera de alcance en la línea base

- Desplegar o publicar cambios.
- Cambiar Shopify, su esquema o sus datos.
- Añadir o actualizar dependencias.
- Reescribir la arquitectura general.
- Sustituir ilustraciones, tipografías o la identidad sin una propuesta visual aprobada.
- Implementar todos los hallazgos en una única tanda.

## Riesgos conocidos del método

- La ventana normal de Atlas limita su ancho, pero DevTools responsive ya permite comprobar layouts CSS exactos hasta 360 px. Las capturas reescaladas prueban composición y breakpoints; una validación posterior en hardware real seguirá siendo útil para teclado virtual, safe areas y comportamiento táctil del navegador.
- La línea base inicial registra principalmente el primer viewport. Contenido profundo, modales, hover, foco, errores y estados con datos se capturarán en las rondas correspondientes.
- Una captura autenticada puede contener información de cuenta. Solo se compartirá si no muestra datos personales necesarios de ocultar y siempre sin interfaz del navegador.
- La revisión de Oracle puede durar horas. Se conservará el ID exacto de sesión y se recuperará esa misma sesión antes de considerar cualquier reintento.
