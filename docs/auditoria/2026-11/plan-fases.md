# Plan de fases 2–4

Agrupación de los **175 hallazgos confirmados** de `hallazgos.md` en **17 cambios candidatos**, cada uno pensado para abrirse como un cambio OpenSpec propio con `openspec-propose` cuando el usuario lo apruebe. Cada hallazgo está en exactamente un cambio; la comprobación es mecánica (`herramientas/plan.py`: 175 de 175 asignados, sin duplicados, y la fase del cambio coincide con la fase propuesta de cada hallazgo). Los 7 IDs pendientes y los 3 descartados de `hallazgos.md` no entran en ningún cambio.

Nivel de riesgo según `engineering-workflow`: **2** funcional (especificación, TDD, revisión independiente); **3** crítico (además diseño con alternativas, revisión de seguridad y aprobación explícita antes de implementar).

## Decisiones que necesita el usuario

| Id | Decisión | Bloquea |
| --- | --- | --- |
| D1 | Nombre de la marca: «ROCKY 035» o «ROCKY 35» (logotipo y marquesina dicen 35; rótulo, pie y dominio, 035). | C13, C14 |
| D2 | Datos del titular para las páginas legales: nombre o razón social, NIF y domicilio. | C02 (bloqueante para abrir la web) |
| D3 | Historial de Rocky IA: dejar de guardarlo, o guardarlo con plazo, decirlo en la política y permitir borrarlo. | C02 |
| D4 | Reproductor de Spotify en `/estudio`: cargarlo solo al pulsar (fachada), pedir consentimiento o quitarlo. | C02 |
| D5 | Mover o borrar `posters/` y `prompts-munecos/` (`CLAUDE.md` exige acuerdo previo; plan en `docs/marketing/`). | C14 |
| D6 | Subir `rescate/produccion-2026-09-29` a GitHub y cómo se publica a partir de ahora (release desde commits remotos). | C01 y todo lo demás |
| D7 | Credenciales de la tienda de desarrollo para verificar contra Shopify real lo que hoy solo se probó con el doble. | Cierre de C03 y C07; los 4 pendientes de Shopify real |

## Orden recomendado

1. **C01** primero: sin la rama en GitHub y el CI en verde no hay base fiable para nada más.
2. **C02** (legal: contiene el único bloqueante, H-007, y necesita D2) y **C03** (catálogo: H-008, que pasa a bloqueante si la tienda real publica más de 8 productos), en paralelo.
3. **C12** antes de los cambios por área: fija los patrones de scroll y foco que reutilizan C08–C11.
4. **C05 → C06** (errores y puerta) y después los cambios por área, que tocan ficheros distintos y pueden ir en paralelo: C04, C07, C08, C09, C10, C11.
5. **Fase 3**: C13 (con D1) y después C14.
6. **Fase 4**: C15 (tras C14), C16 y C17. Al terminar, repetir `metricas.md` con los mismos comandos y la batería de Playwright de la auditoría para comparar.

## Cambios candidatos

| Cambio | Nombre propuesto | Fase | Hallazgos | Severidad máx. | Nivel | Depende de |
| --- | --- | ---: | ---: | --- | --- | --- |
| C01 | `publicacion-y-dependencias` | 2 | 4 | importante | 3 (proceso de producción) | Ninguna: va primero. |
| C02 | `legal-y-privacidad` | 2 | 4 | bloqueante | 3 (datos personales) | C01. |
| C03 | `catalogo-vivo` | 2 | 9 | importante | 2 | C01. Probar contra la tienda de desarrollo real (D7). |
| C04 | `avisos-de-drop` | 2 | 5 | importante | 3 (migración de datos personales: emails) | C03 (handles de producto). |
| C05 | `resiliencia-y-errores` | 2 | 13 | importante | 2 | C01. |
| C06 | `puerta-y-politica-de-origen` | 2 | 7 | importante | 3 (seguridad) | C05 (contrato de errores). |
| C07 | `carrito-checkout-y-cuenta` | 2 | 19 | importante | 3 (sesiones y pago) | C05. |
| C08 | `rocky-ia` | 2 | 14 | importante | 2 | C03. |
| C09 | `crew` | 2 | 13 | importante | 3 (créditos ligados a pedidos) | C05. |
| C10 | `estudio-de-beats` | 2 | 24 | importante | 3 (autorización de la moderación y antiabuso del ranking) | C12 (gestión de foco común). |
| C11 | `noche-y-musica` | 2 | 15 | importante | 2 | C12. |
| C12 | `navegacion-y-accesibilidad-global` | 2 | 19 | importante | 2 | C01. Va antes de C08–C11 porque fija los patrones de foco que usan. |
| C13 | `identidad-y-sistema-visual` | 3 | 8 | importante | 2 | Fase 2 terminada (para no rehacer pantallas). |
| C14 | `orden-del-arte` | 3 | 2 | menor | 2 | C13 (prefijo de marca). |
| C15 | `imagenes-y-medios` | 4 | 6 | importante | 2 | C14 (no optimizar ficheros que luego se mueven). |
| C16 | `carga-y-estabilidad` | 4 | 8 | importante | 2 | C15. |
| C17 | `seo-y-cache` | 4 | 5 | importante | 2 | C05 (404 de la SPA). |

### C01 · `publicacion-y-dependencias` (fase 2)

**Ejecución (2026-11-08):** se parte en dos cambios OpenSpec sin cambiar su alcance: `dependencias-y-ci` (nivel 2: H-002, H-006, H-144, y la parte de H-001 de subir la rama, ya hecha) y `proceso-de-publicacion` (nivel 3: resto de H-001), para que el CI en verde no espere a la aprobación del diseño de nivel 3.

**Alcance.** Subir la rama de rescate, devolver el CI a verde (`npm audit fix` y retocar los pines exactos de `package.json` que lo impedían), documentar `.env.example` y versionar en el repo el proceso de release y promoción que hoy vive solo en la Raspberry.

**Nivel de riesgo:** 3 (proceso de producción). **Depende de:** Ninguna: va primero. **Decisión pendiente:** D6 resuelta: rama subida a GitHub el 2026-11-08.

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-001 | importante | El código publicado no estaba en Git y el proceso de publicación no está versionado |
| H-002 | importante | `npm audit` encuentra 15 vulnerabilidades y el CI fallaría |
| H-006 | menor | `.env.example` no documenta nueve variables que el servidor lee |
| H-144 | menor | `modo-neon.m4a` y `theme-init.js` tienen permisos 600 en el árbol de trabajo y en `dist/` |

### C02 · `legal-y-privacidad` (fase 2)

**Alcance.** Datos del titular en las páginas legales, política de cookies fiel a lo que se guarda, consentimiento o carga bajo demanda del reproductor de Spotify y retención del historial de Rocky IA.

**Nivel de riesgo:** 3 (datos personales). **Depende de:** C01. **Decisión pendiente:** Datos legales (D2), retención del chat (D3) y Spotify (D4).

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-007 | bloqueante | Las páginas legales publican «PENDIENTE» en lugar de los datos del titular |
| H-017 | importante | La política de cookies no cuenta lo que se guarda ni el reproductor de Spotify, que se carga si |
| H-018 | importante | El historial de Rocky IA se guarda 30 días en el servidor: la política dice que no, y el usuari |
| H-070 | menor | `GET /account` manda al navegador el identificador y el email del cliente sin necesitarlos |

### C03 · `catalogo-vivo` (fase 2)

**Alcance.** Catálogo vivo completo y paginado, productos sin foto, estados de carga y error del catálogo y coherencia de las fichas de drop.

**Nivel de riesgo:** 2. **Depende de:** C01. Probar contra la tienda de desarrollo real (D7). **Decisión pendiente:** Tienda de desarrollo real para verificar (D7).

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-008 | importante | El catálogo vivo solo carga 8 productos: los demás no salen y su ficha dice «Producto no encont |
| H-019 | importante | En modo Shopify, un producto a la venta sin foto se esconde «bajo llave» |
| H-052 | menor | Si falla `/api/shopify/status`, la tienda se queda sin productos aunque el catálogo de vista pr |
| H-053 | menor | Mientras carga, la portada dice «0 diseños» y la categoría enseña su handle |
| H-056 | menor | Las fichas de demo enseñan «Próximamente» dos veces |
| H-059 | menor | El mockup de un diseño bajo llave dice siempre «Drop 4 · sin revelar» |
| H-060 | menor | Un drop sale «Disponible» aunque todo esté agotado o el carrito no funcione |
| H-063 | menor | Las 19 fichas de diseños bajo llave no tienen ningún enlace |
| H-066 | menor | «← Volver a la tienda» lleva siempre a la portada |

### C04 · `avisos-de-drop` (fase 2)

**Alcance.** Una sola lista de avisos por drop, respuesta que no revele si un email ya está apuntado, reconocimiento de productos más allá de los 50 últimos y accesibilidad del formulario.

**Nivel de riesgo:** 3 (migración de datos personales: emails). **Depende de:** C03 (handles de producto). **Decisión pendiente:** —

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-020 | importante | Los avisos de un mismo drop se reparten en listas distintas y el envío no los junta |
| H-174 | importante | La API de avisos revela si un email ya está apuntado |
| H-054 | menor | Con el aviso ya apuntado, «Avísame» y el enlace `#aviso` no hacen nada visible |
| H-061 | menor | El servidor solo reconoce los 50 productos más recientes para los avisos |
| H-064 | menor | El campo de email del aviso no tiene etiqueta visible |

### C05 · `resiliencia-y-errores` (fase 2)

**Alcance.** ErrorBoundary y recuperación de chunks, contrato único de errores (`HttpError` con `code` y log), mensajes por contexto y sonda de salud.

**Nivel de riesgo:** 2. **Depende de:** C01. **Decisión pendiente:** —

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-009 | importante | Un fallo al cargar o al pintar una página deja la web en blanco |
| H-039 | menor | `preloadRecovery.js` lee `sessionStorage` sin protegerse de un almacenamiento bloqueado |
| H-058 | menor | Errores respondidos a mano: sin `code` y sin línea de log |
| H-103 | menor | Un límite numérico fuera de rango vuelve en silencio al valor por defecto |
| H-116 | menor | Los mensajes genéricos de error hablan de «la tienda» fuera de la tienda |
| H-154 | menor | `/api`, sin barra final, devuelve la SPA con 200 |
| H-155 | menor | El servidor usa `NETWORK_ERROR` para una caída de Shopify, el mismo código que «el navegador no |
| H-156 | menor | Un 401 o un 403 de Shopify llegan al navegador como si el problema fuera del usuario |
| H-157 | menor | `RateLimit-Reset` lleva una fecha absoluta en vez de los segundos que faltan |
| H-159 | menor | La sonda de salud no detecta un almacén dañado después del arranque |
| H-162 | menor | Un error de configuración tumba el servidor con una traza de Node, sin línea de log JSON |
| H-163 | menor | Las líneas de log de error pierden el nombre del evento |
| H-175 | menor | El escáner de secretos no revisa los ficheros `.py` ni `.tsv` (añadido en la segunda ronda de revisión) |

### C06 · `puerta-y-politica-de-origen` (fase 2)

**Alcance.** Política de origen que no bloquee los recursos propios (alias y `www.`) y comportamiento coherente de la puerta: HEAD, salud, errores de campo, caducidad del acceso y vuelta a la ruta pedida.

**Nivel de riesgo:** 3 (seguridad). **Depende de:** C05 (contrato de errores). **Decisión pendiente:** —

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-011 | importante | Abrir la web desde un origen no listado la deja en blanco: la política de origen bloquea los re |
| H-148 | menor | Cuando caduca el acceso de la puerta, la web abierta solo dice «La tienda no ha podido completa |
| H-149 | menor | En algunos errores, la puerta responde con texto plano o JSON en vez de con su página |
| H-150 | menor | Tras desbloquear la puerta se pierde la ruta que se había pedido |
| H-151 | menor | Con la puerta activa, `HEAD /` responde 404 |
| H-158 | menor | Con la puerta activa, `/api/health` responde distinto que el resto y delata que existe |
| H-164 | menor | El error de la puerta no se asocia al campo de la contraseña |

### C07 · `carrito-checkout-y-cuenta` (fase 2)

**Alcance.** Carrito que se recupera de un carrito caducado o pagado, cierre de sesión local aunque falle Shopify, token revocado, errores de login con vuelta a la tienda, estados de carga y error del carrito y las pruebas que faltan.

**Nivel de riesgo:** 3 (sesiones y pago). **Depende de:** C05. **Decisión pendiente:** Tienda de desarrollo real para verificar (D7).

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-021 | importante | La sesión no suelta un carrito que Shopify ya no devuelve |
| H-022 | importante | Cerrar sesión depende de Shopify: si falla, tampoco se cierra en local |
| H-023 | importante | Con el token de cliente revocado, la cuenta se queda sin forma de entrar ni de salir |
| H-024 | importante | Los errores del login de cliente acaban en JSON crudo, sin vuelta a la tienda |
| H-025 | importante | Faltan pruebas del checkout, del cierre de sesión, de los errores del callback y de los contrat |
| H-069 | menor | Salir de la cuenta destruye la sesión entera: se pierde el carrito y, con la puerta activa, el  |
| H-071 | menor | Textos del carrito que no dicen lo que pasa |
| H-072 | menor | El carrito no tiene estado de carga ni de error: dice que está vacío en los dos casos |
| H-073 | menor | Tras un error de carrito, la web sigue enseñando líneas que ya no existen |
| H-074 | menor | Los avisos y errores del carrito se duplican, se borran o reaparecen donde no toca |
| H-075 | menor | Los cambios del carrito no se anuncian y la lista de avisos pierde su semántica de lista |
| H-076 | menor | Botones de cantidad de 28 px y cursor de espera sin nada pendiente |
| H-077 | menor | El icono del carrito no tiene estado activo visible en `/cart` |
| H-078 | menor | El servidor reenvía al navegador el `target` de los avisos de Shopify, con el token del carrito |
| H-079 | menor | La cookie de sesión caduca a los 30 días de crearse, aunque haya actividad |
| H-080 | menor | Volver a entrar sin haber salido deja huérfano el token de cliente anterior |
| H-081 | menor | El login abre una sesión antes de validar la ruta de retorno |
| H-082 | menor | En modo demo no se puede comprar nada, así que el carrito demo y sus textos son código muerto |
| H-084 | menor | El tope de 20 unidades por línea está escrito en cuatro sitios |

### C08 · `rocky-ia` (fase 2)

**Alcance.** Búsqueda de productos y filtros de Rocky IA, uso del catálogo vivo en modo Shopify, no llamar al modelo cuando no hace falta, cancelación al cerrar la barra y accesibilidad del historial.

**Nivel de riesgo:** 2. **Depende de:** C03. **Decisión pendiente:** —

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-026 | importante | Rocky IA llama al modelo aunque luego vaya a responder con la frase fija de compra |
| H-027 | importante | Rocky IA contesta con los primeros productos del catálogo cuando la búsqueda se queda sin térmi |
| H-085 | menor | Rocky IA no distingue por qué falla |
| H-086 | menor | El filtro contra la manipulación del prompt bloquea preguntas con el verbo «dan» |
| H-087 | menor | Una pregunta sobre el perfil Crew con una palabra de compra entra en modo compra |
| H-088 | menor | En modo Shopify, Rocky IA sigue usando el catálogo de vista previa |
| H-089 | menor | El historial del chat se lee mal con un lector de pantalla |
| H-090 | menor | Cada mensaje fallido del chat deja un `console.error` |
| H-091 | menor | El CSS del chat tiene dos bloques `@media (max-width: 640px)` seguidos y el segundo pisa al pri |
| H-092 | menor | El prompt de Rocky IA no incluye a «El Vigía» en LA CREW |
| H-104 | menor | Las tarjetas de Rocky IA enseñan «Default Title» en los productos de variante única |
| H-115 | menor | La barra de Rocky IA anida un `role="status"` dentro de una región `aria-live` |
| H-124 | menor | Cerrar la barra de Rocky IA no cancela la petición: el panel vuelve a abrirse solo y gasta cupo |
| H-134 | menor | Un comentario y un test dicen que en Rocky IA no hay pared de noche, pero sí la hay |

### C09 · `crew` (fase 2)

**Alcance.** Marco «Tinta Azul», perfil que no se queda colgado, webhooks tolerantes a la versión de API, registrados después de procesarse y con las desinstalaciones atendidas, formato español de cifras y accesibilidad de cromos y canjes.

**Nivel de riesgo:** 3 (créditos ligados a pedidos). **Depende de:** C05. **Decisión pendiente:** —

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-028 | importante | El «Marco Tinta Azul» se canjea y se equipa, pero no se ve |
| H-029 | importante | Si falla el perfil Crew, `/mi-crew` se queda en la pantalla de carga sin salida |
| H-037 | importante | Si la versión de API de un webhook no coincide exactamente, se rechaza y los créditos Crew no l |
| H-093 | menor | `/mi-crew` enseña la vista previa antes de saber si hay sesión |
| H-094 | menor | Los botones de canjear y equipar ocultan el coste y el estado a los lectores de pantalla |
| H-095 | menor | Los números y plurales del perfil Crew no siguen el formato español |
| H-098 | menor | Un marco equipado no se puede quitar |
| H-099 | menor | Cambiar el hash estando en `/crew` centra el cromo nuevo pero no lo gira |
| H-100 | menor | Los lectores de pantalla no reciben la puntuación de las estadísticas del cromo |
| H-101 | menor | «¡Enlace copiado!» no se anuncia |
| H-102 | menor | El aro de foco de los cromos desaparece con el ratón encima |
| H-160 | menor | Los avisos de desinstalación de la app de Shopify se guardan y nadie los lee |
| H-161 | menor | La entrega de un webhook se registra como aceptada antes de procesarla |

### C10 · `estudio-de-beats` (fase 2)

**Alcance.** Remezclar y enlaces de beat, audio del ranking controlable, protección contra votos y reportes abusivos, moderación, paso 16 visible, REC y accesibilidad de la mesa.

**Nivel de riesgo:** 3 (autorización de la moderación y antiabuso del ranking). **Depende de:** C12 (gestión de foco común). **Decisión pendiente:** —

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-030 | importante | «Remezclar» carga el beat de la URL anterior |
| H-031 | importante | Los parámetros de un enlace de beat se quedan en la URL y pisan las ediciones al recargar |
| H-032 | importante | Un beat del ranking sigue sonando sin botón para pararlo cuando su fila desaparece |
| H-033 | importante | Una sola persona puede ocultar cualquier beat o inflar los «me mola» borrando la cookie |
| H-034 | importante | En escritorio, el paso 16 del secuenciador no cabe |
| H-105 | menor | El «● REC» del LCD nunca se pone rojo ni parpadea |
| H-106 | menor | La mesa promete que un enlace «se abre sonando», y no suena |
| H-107 | menor | Publicar un beat repetido de uno oculto dice «te lo enseñamos», pero no se ve |
| H-108 | menor | `GET /api/beats` no tiene límite de peticiones y carga todo el almacén en cada lectura |
| H-109 | menor | El filtro de palabras del ranking tiene falsos positivos y culpa al nombre cuando el rechazado  |
| H-110 | menor | El chip «Boom bap» sale marcado aunque el patrón cargado sea otro |
| H-111 | menor | El atajo «Espacio arranca» no se puede usar |
| H-112 | menor | Las celdas del secuenciador no distinguen fantasma, golpe y acento, y borrar en táctil depende  |
| H-113 | menor | El botón de silenciar se llama como la pista, y los chips de ritmo no exponen su estado |
| H-114 | menor | Las pestañas del ranking y los colores del spray usan roles compuestos, pero no responden a las |
| H-117 | menor | Al pasar de un beat del ranking a otro, el nuevo entra a mitad de compás |
| H-120 | menor | Con REC encendido, los pads sin pista suenan pero no se graban, y nada lo avisa |
| H-121 | menor | El pad de una pista silenciada no suena |
| H-122 | menor | Si el autocompletado rellena el campo trampa, el beat se descarta y la web dice «Publicado» |
| H-123 | menor | En móvil no se puede cambiar el volumen de cada pista |
| H-125 | menor | Un aviso del ranking sustituye para siempre a la nota de ayuda |
| H-126 | menor | Moderación del ranking: llave en claro, botón «Quitar» con cualquier valor y límite compartido  |
| H-127 | menor | Tras remezclar, la vista salta a la mesa pero el foco se queda en el ranking |
| H-128 | menor | En táctil, los botones deshabilitados de publicar y de la barra no dicen por qué |

### C11 · `noche-y-musica` (fase 2)

**Alcance.** Estado real de la radio al apagar la noche, setlist coherente, recuperación de pistas, spray por ruta y robusto ante datos corruptos, linterna y capas en móvil.

**Nivel de riesgo:** 2. **Depende de:** C12. **Decisión pendiente:** —

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-035 | importante | Al apagar el descontrol con MODO NEÓN sonando, la radio se calla pero la interfaz sigue «sonand |
| H-044 | menor | En el 404 a oscuras en móvil, «Salir de aquí» puede quedar cortado fuera de la pantalla |
| H-119 | menor | De noche, la setlist del estudio marca BARRO mientras suena MODO NEÓN |
| H-129 | menor | «Tema siguiente» y «Tema anterior» no hacen lo que dicen con un solo tema por cinta |
| H-130 | menor | Si la cinta falla, la radio no avisa y no se recupera sin recargar |
| H-131 | menor | Encender el descontrol pone música sin avisar |
| H-132 | menor | La barra de progreso de la radio avanza 0,1 s por pulsación de flecha y se anuncia sin unidad |
| H-133 | menor | El radiocasete dice 0:00 / 0:00 hasta el primer play, mientras la setlist dice 1:53 |
| H-138 | menor | El spray arrastra estado de la página anterior al cambiar de ruta |
| H-139 | menor | La pintada guardada no coincide con lo que se ve: pierde el último trazo, recorta en silencio o |
| H-140 | menor | Una pintada guardada con datos corruptos deja la página en blanco al encender el descontrol |
| H-141 | menor | Si `toBlob` falla, la foto del spray dice «Pinta algo primero.» |
| H-142 | menor | En móvil, el bote y la caja del spray quedan por encima de la hoja del menú |
| H-143 | menor | El interruptor del descontrol cambia a la vez su nombre y `aria-pressed` |
| H-146 | menor | El primer toque en una zona sin enlaces ni botones lleva la linterna al centro de `<main>` |

### C12 · `navegacion-y-accesibilidad-global` (fase 2)

**Alcance.** Bloqueo de scroll que funcione, «Saltar al contenido», menú móvil cerrable desde dentro, foco y anuncio al cambiar de ruta, foco que no cae al `<body>`, intro saltable y movimiento reducido en vivo.

**Nivel de riesgo:** 2. **Depende de:** C01. Va antes de C08–C11 porque fija los patrones de foco que usan. **Decisión pendiente:** —

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-010 | importante | El bloqueo de scroll no bloquea: la página se mueve bajo la intro, el menú móvil y el lightbox |
| H-013 | importante | «Saltar al contenido» queda tapado por la barra |
| H-014 | importante | La hoja del menú móvil no se puede cerrar desde dentro |
| H-015 | importante | Al cambiar de ruta no se mueve el foco ni se anuncia la página nueva |
| H-016 | importante | El foco cae al `<body>` cuando el botón pulsado se deshabilita o desaparece |
| H-040 | menor | La intro no se puede saltar y la tienda de debajo sigue recibiendo el foco |
| H-041 | menor | `ScrollToTop` decide por el tipo de navegación: no sube en el segundo clic y sí sube al remezcl |
| H-042 | menor | La carga de una página diferida no se indica ni se anuncia |
| H-045 | menor | La cinta del pie se mueve sin fin y no se puede parar |
| H-046 | menor | La Estampida cuenta teclas que ya usa la mesa de beats |
| H-048 | menor | La preferencia de movimiento reducido no se sigue en vivo, y el hook que lo haría no se usa |
| H-049 | menor | El Curioso rompe la app con ventanas de menos de unos 86 px de ancho |
| H-050 | menor | Los garabatos decorativos declaran a la vez `role="img"` y `aria-hidden="true"` |
| H-051 | menor | Al ensanchar la ventana con la hoja del menú abierta, el foco a veces acaba en `<body>` |
| H-055 | menor | Controles repetidos con el mismo nombre accesible |
| H-057 | menor | La foto de la ficha y su lightbox pierden la descripción de la imagen |
| H-065 | menor | El botón de la foto de un diseño bajo llave está deshabilitado pero se anuncia como «Ver … en g |
| H-067 | menor | El anillo de foco de las fotos de las tarjetas queda recortado |
| H-173 | menor | Nombres accesibles que no coinciden con el texto visible y encabezados fuera de orden |

### C13 · `identidad-y-sistema-visual` (fase 3)

**Alcance.** Decisión de marca y su aplicación, contraste de día y de noche en los tokens, tipografía monoespaciada como token y colisiones de personajes con texto y CTA.

**Nivel de riesgo:** 2. **Depende de:** Fase 2 terminada (para no rehacer pantallas). **Decisión pendiente:** Nombre de marca (D1).

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-036 | importante | Bajo la oscuridad del modo noche, el texto secundario no llega al contraste mínimo |
| H-038 | importante | La web usa dos nombres de marca: «ROCKY 35» y «ROCKY 035» |
| H-172 | importante | Contraste insuficiente en las etiquetas «Próximamente» y en los rótulos pequeños grises |
| H-147 | menor | En móvil, «MODO NEÓN» queda cortado en la cabecera del chat |
| H-165 | menor | Estilos fuera del sistema de tokens: la tipografía monoespaciada del estudio y el CSS de la pue |
| H-166 | menor | Con movimiento reducido, el patinador se queda detrás del botón de la portada |
| H-167 | menor | A 900 px, la ficha deja el precio y la compra por debajo del pliegue |
| H-168 | menor | A 480 px, el DJ tapa parte del subtítulo del estudio |

### C14 · `orden-del-arte` (fase 3)

**Alcance.** Convención de nombres del arte, reorganización de `src/images/` y `public/products/`, pósters duplicados y salida de `posters/` y `prompts-munecos/` según `docs/marketing/`.

**Nivel de riesgo:** 2. **Depende de:** C13 (prefijo de marca). **Decisión pendiente:** Acuerdo para mover o borrar `posters/` y `prompts-munecos/` (D5).

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-004 | menor | Hay pósters duplicados con distinto número |
| H-005 | menor | El arte no tiene una convención de nombres escrita |

### C15 · `imagenes-y-medios` (fase 4)

**Alcance.** Fotos de producto a su tamaño con variantes por ancho, animaciones del pie y de la Estampida más ligeras o diferidas, audio y descargas innecesarias.

**Nivel de riesgo:** 2. **Depende de:** C14 (no optimizar ficheros que luego se mueven). **Decisión pendiente:** —

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-003 | importante | Dos fotos de producto miden 5906 × 5906 px |
| H-169 | importante | La animación del pie pesa 650 kB y se descarga en todas las páginas con pie |
| H-047 | menor | La primera Estampida descarga 615 KiB de ilustraciones grandes para pintarlas pequeñas |
| H-068 | menor | En móvil, `/menudrop` descarga la ilustración que oculta |
| H-083 | menor | Con la red lenta, el repartidor del carrito cruza sin dibujo la primera vez |
| H-145 | menor | BARRO pesa 2,68 MB a 190 kbps, tres veces la tasa de MODO NEÓN |

### C16 · `carga-y-estabilidad` (fase 4)

**Alcance.** LCP y CLS: dividir el JS común, no diferir la imagen LCP, reservar alto del contenido, y coste de lienzo, linterna y observadores de noche.

**Nivel de riesgo:** 2. **Depende de:** C15. **Decisión pendiente:** —

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-170 | importante | El pie se desplaza al cargar: CLS de 0,2 a 0,5 en cinco páginas |
| H-171 | importante | LCP de 5 a 10 s en móvil |
| H-096 | menor | Leer el perfil Crew reescribe entero el almacén cifrado |
| H-097 | menor | `useCrewProfile` devuelve un objeto nuevo en cada render y anula la memoización de la tienda |
| H-118 | menor | La mesa y el ranking crean cada uno su propio `AudioContext` |
| H-135 | menor | El lienzo del spray ocupa toda la página en cada ruta de noche, aunque nadie pinte |
| H-136 | menor | La linterna repinta la ventana entera en cada movimiento |
| H-137 | menor | Cada componente con `useNightMode` crea su propio `MutationObserver` |

### C17 · `seo-y-cache` (fase 4)

**Alcance.** Canónico y metadatos por ruta, 404 reales, URLs duplicadas y caché de los recursos de la puerta.

**Nivel de riesgo:** 2. **Depende de:** C05 (404 de la SPA). **Decisión pendiente:** —

| Hallazgo | Severidad | Título |
| --- | --- | --- |
| H-012 | importante | El canónico y `og:url` apuntan a la portada en todas las rutas |
| H-043 | menor | Las páginas que no existen responden 200, sin `noindex` y con un título que no corresponde |
| H-062 | menor | Hay URLs duplicadas en el catálogo, y en `/products/...` ningún enlace de la barra queda activo |
| H-152 | menor | El CSS y los medios de la puerta van con `no-store` y se descargan en cada visita |
| H-153 | menor | `GET /products`, sin barra final, recibe un 301 sin las cabeceras de caché de la app |

## Propuesta aparte (sin hallazgos)

- **`pruebas-e2e`** (nivel 2): convertir los scripts de Playwright de la auditoría (`scratchpad/e1/` y `scratchpad/e2/`, con el doble de Shopify y OpenRouter) en una batería e2e mantenida en el repo, para que cada cambio de las fases 2–4 pruebe sus recorridos. Añade una dependencia de desarrollo (`@playwright/test`, versión fijada) que habría que justificar en su propuesta. Mientras no exista, los scripts de la auditoría se pueden reutilizar a mano.

## Aprobación

**2026-11-08: aprobado por el usuario tal como está** («Sí, lo apruebo. Comienza.»), con el
orden recomendado.

**Decisiones del usuario (2026-11-08):**

| Id | Respuesta | Efecto |
| --- | --- | --- |
| D1 | «Rocky035»: la marca es **ROCKY 035** | C13 alinea logotipo, marquesina y prefijos con «035» |
| D2 | Los datos legales, más adelante | H-007 sigue bloqueando la apertura al público; C02 deja preparado el mecanismo |
| D3 | **No guardar el historial** de Rocky IA | C02 elimina la persistencia del historial en el servidor y ajusta la política |
| D4 | «Cargarlo»: se interpreta como **cargar el reproductor de Spotify solo al pulsar** (fachada), la primera opción ofrecida | C02; pendiente de confirmación si la intención era otra |
| D5 | Los pósters **se quedan en el repo** | C14 no mueve ni borra `posters/` ni `prompts-munecos/`; solo ordena y documenta |
| D6 | **Subir la rama** `rescate/produccion-2026-09-29` a GitHub | C01 |
| D7 | Las credenciales de la tienda de desarrollo, más adelante | C03 y C07 se verifican con el doble hasta entonces |

**Ajustes tras la revisión independiente de la auditoría (2026-11-08):** H-174 (la API de
avisos revela si un email ya está apuntado) entra en C04; H-148 a H-150 (puerta) pasan de
C05 a C06 y H-160 y H-161 (webhooks) de C05 a C09, para que los cambios de nivel 3 los
traten con su revisión de seguridad; C10 sube a nivel 3 por la autorización de la
moderación; H-008 queda como importante, salvo que la tienda real publique más de 8
productos.
