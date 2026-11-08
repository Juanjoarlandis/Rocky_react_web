# Diseño: auditoría integral de la web (fase 1)

## Context

Ver `proposal.md` (Why). Estado de partida, medido el 2026-11-08 sobre el commit
`7d2bf57` (rama `rescate/produccion-2026-09-29`):

- 11 rutas en la SPA: `/`, `/products/:category?`, `/product/:productId`, `/cart`,
  `/rockyIA`, `/crew`, `/mi-crew`, `/estudio`, `/menudrop`, `/legal/:page` y `*` (404).
- 11 features en `src/features/` (cart, catalog, chat, crew, estampida, legal, music,
  night, peeker, storefront, studio) y componentes comunes en `src/components/`
  (NavBar, Footer, SplashIntro, StreetWall, NotFound, doodles).
- Unos 25 endpoints en `server/http/routes/` (avisos, beats, chat, crew, drop, health y
  Shopify: catalog, cart, checkout, account, webhooks) más `/access-gate`.
- Arte: 76 ficheros en `src/images/optimized`, 21 en `public/` (productos, música, iconos y
  manifiesto), 46 en `posters/` (47 MB) y 87 en `prompts-munecos/`.
- Línea base verde con Node 24.11: 99 ficheros / 670 tests, lint, lint:css, build
  (JS principal 336,79 kB, 110,80 kB gzip) y security:check.
- Sin credenciales, la web arranca en local con el catálogo de vista previa
  (`shared/preview-products.mjs`); carrito, checkout, cuenta y Crew necesitan Shopify, y
  Rocky IA necesita OpenRouter.
- Producción (`rocky035.com`) tiene activa la puerta privada: sin contraseña solo se ve
  la página «Coming soon».

## Goals / Non-Goals

**Goals:**
- Que no quede ningún camino de usuario sin inventariar, y que la cobertura se pueda
  comprobar mecánicamente contra el código.
- Que cada hallazgo sea reproducible y lleve la información suficiente para abrir un
  cambio OpenSpec sin volver a investigar.
- Que las métricas se puedan repetir al final de la fase 4 para medir la mejora.

**Non-Goals:**
- Corregir nada durante la auditoría, ni siquiera cosas triviales (ver R5).
- Escribir tests e2e o añadir herramientas al repositorio.
- Medir producción tras la puerta con herramientas automáticas.

## Decisions

### D1. Sin especificaciones de comportamiento en esta fase (`skip_specs: true`)

La auditoría observa, no cambia comportamiento. **Alternativas descartadas**:
(a) escribir ya especificaciones del comportamiento actual a partir del código: fijaría
como requisito lo que hoy puede estar roto y duplicaría el mapa de recorridos antes de
contrastarlo; (b) especificar el «proceso de auditoría» como capability: las specs
describen el sistema, no el trabajo. **Consecuencia**: los criterios de aceptación de
este cambio están en la sección final de este documento, y cada cambio de las fases 2–4
escribirá las specs de los comportamientos que toque, partiendo del mapa de recorridos.

### D2. Resultados en `docs/auditoria/2026-11/`

Es una foto fechada; encaja con la regla de `docs/README.md` (lo vivo junto al código y
lo histórico por fecha) y queda accesible cuando este cambio se archive. Se añade una
fila al índice de `docs/README.md`. **Alternativa descartada**: dentro de la carpeta del
cambio OpenSpec, que al archivarse queda como historial y es peor punto de referencia
para las fases siguientes.

Documentos:

| Fichero | Contenido |
| --- | --- |
| `README.md` | Alcance, entorno (fecha, commit, Node, Chrome, viewports), estado global y resumen de cifras. |
| `recorridos.md` | Mapa de recorridos y matrices de cobertura (rutas, features y endpoints × recorridos). |
| `ejecucion.md` | Resultado de cada ejecución (añadido al ejecutar). |
| `herramientas/` | Scripts de la auditoría, para poder repetirla (añadido tras la revisión independiente). |
| `hallazgos.md` | Todos los hallazgos, ordenados por severidad. |
| `arte.md` | Inventario de arte y revisión de dirección artística. |
| `metricas.md` | Métricas de partida y comandos exactos para repetirlas. |
| `plan-fases.md` | Hallazgos agrupados en cambios candidatos para las fases 2–4. |
| `capturas/` | Solo las capturas que respaldan hallazgos o la revisión de arte (ver D7). |

### D3. Identificadores y campos

- **Recorrido** `R-<ÁREA>-NN` (p. ej. `R-CART-03`): área, precondiciones, pasos,
  resultado esperado, datos que escribe (ninguno, local, tienda de desarrollo),
  entorno mínimo (D4), viewports, resultado (`OK` · `FALLO` · `NO EJECUTADO: motivo`) y
  hallazgos asociados.
- **Hallazgo** `H-NNN`: categoría (funcional, arte, rendimiento, accesibilidad, SEO,
  operación, seguridad observada), severidad (bloqueante · importante · menor, la misma
  escala que la revisión de código), ubicación (ruta y `archivo:línea` cuando aplique),
  pasos para reproducirlo, esperado frente a observado, evidencia, entorno y fase
  propuesta. Un hallazgo sin reproducción ni evidencia se marca `SIN CONFIRMAR`.
- **Recurso de arte**: ruta, formato, medidas, peso, uso (`referenciado` ·
  `dinámico` · `sin referencia`), dónde se usa y si cumple la nomenclatura.

### D4. Entornos

| Id | Qué es | Qué cubre |
| --- | --- | --- |
| E1 | Local, `npm run dev`, sin credenciales (catálogo de vista previa, almacén en memoria o `.data/` local, que está en `.gitignore`) | Navegación, catálogo, producto, menú drop, legal, modo noche, música, estudio, avisos, easter eggs y 404 |
| E2 | Local con el `.env` que rellene el usuario: tienda de desarrollo `rocky-dev.myshopify.com` y OpenRouter `:free` | Carrito, paso a checkout (sin pagar), cuenta de cliente si el origen lo permite, Crew y Rocky IA |
| E3 | Producción, en el navegador integrado, con la puerta abierta por el propio usuario | Comprobación de solo lectura de los recorridos clave y de lo que solo existe allí (Cloudflare, catálogo real) |

Para saber si Shopify u OpenRouter están configurados se usan los endpoints de estado
de la propia aplicación (`/api/shopify/status`, `/api/health`); el `.env` no se lee. En
E3 no se ejecuta nada que escriba: ni carrito, ni avisos, ni chat, ni beats, ni Crew.
Los webhooks no se pueden lanzar desde el navegador: se revisan por código y por sus
tests, y se marcan así.

**Revisión del 2026-11-08 (E2).** El usuario no puede preparar el `.env` de la tienda de
desarrollo y pide simularlo. E2 pasa a ser **E2 simulado**: el servidor real arranca con
un módulo de precarga (fuera del repo) que sustituye `fetch` y responde con un doble local
de Shopify y OpenRouter, y bloquea cualquier otra salida. Los resultados se marcan
`E2 simulado` y no prueban el comportamiento real de Shopify ni la calidad del modelo; esa
parte queda pendiente de una tienda de desarrollo real. **Alternativa descartada**: crear
credenciales reales, que exigiría entrar en las cuentas del usuario.

### D5. Ejecución de recorridos

En escritorio (1440 px) y en móvil (375 × 812, táctil). Las pantallas principales se
revisan además en los cortes del proyecto (480, 640, 900 y 1200) para la parte de arte.
En cada recorrido se recogen errores de consola, peticiones fallidas y, si falla, una
captura. Se hace una pasada de teclado (foco visible, orden de tabulación, Escape en
modales) en cada pantalla.

**Revisión del 2026-11-08, al empezar el bloque 3.** El mapa salió con 254 recorridos,
183 de ellos en E1: unas 366 ejecuciones. Se reparte así:

- **Pasada sistemática con Playwright 1.64.1** (publicado el 2026-10-14) y Google Chrome
  del sistema, con scripts por área en una carpeta temporal fuera del repo y sin añadir
  nada a `package.json`. Cada área arranca su propia instancia de Express con el build de
  `dist/`, en su puerto y con almacén en memoria, para que los límites por IP de un área
  no contaminen otra. Las variables de `.env.example` se fijan al arrancar para que un
  `.env` de E2 en la raíz no convierta E1 en otra cosa.
- **Navegador integrado** para lo que pide criterio visual: revisión de arte (5.4),
  comprobación manual de los fallos de teclado y foco que detecte la pasada, y E3 con la
  puerta abierta por el usuario.

**Alternativa descartada**: ejecutar los 366 casos a mano en el navegador integrado. Es
lento y no se puede repetir al final de la fase 4 para comprobar las correcciones;
los scripts sí.

### D6. Métricas

- **Lighthouse 13.5.0** (publicada el 2026-09-18) con `npx lighthouse@13.5.0` y Google
  Chrome del sistema, sin añadirlo a `package.json`. Móvil (limitación simulada) y
  escritorio, tres pasadas por página y la mediana.
- Contra el build de producción servido en local (`npm run build` y el servidor de
  Express con la puerta desactivada y el catálogo de vista previa), porque producción
  está tras la puerta y pasarle la cookie sería usar una credencial.
- Páginas: `/`, `/products`, una ficha de producto, `/menudrop`, `/estudio`, `/crew`,
  `/rockyIA`, `/cart`, una página legal y la 404.
- Además: tamaños por chunk de `npm run build`, bytes de imagen por página (de los
  informes de Lighthouse), cabeceras de caché y compresión de los estáticos de
  producción con `curl` (solo lectura) y `npm audit`.
- Cada medida guarda fecha, commit, versión de Node y Chrome, y el comando exacto.

### D7. Capturas en el repositorio, con límite

Como mucho unas 40 capturas en WebP, de 150 kB o menos cada una, y solo para hallazgos
y para la revisión de arte. El resto de la evidencia va en texto (errores de consola,
peticiones, pasos). **Alternativas descartadas**: ninguna captura (se pierde la
evidencia visual, imprescindible para el arte) o todas (engorda el repo, justo cuando
`docs/marketing/` planea sacar binarios de él). No se capturan datos personales:
pantallas de cuenta con email o pedidos se recortan o no se capturan.

### D8. Inventario de arte

Listado mecánico con herramientas del sistema (`find`, `identify` de ImageMagick o
equivalente) desde una carpeta temporal fuera del repo. El comando exacto se copia en
`arte.md` para poder repetirlo. El uso se detecta buscando cada nombre en `src/`,
`server/`, `shared/`, `index.html` y CSS. Los nombres compuestos en tiempo de ejecución
(p. ej. en `src/features/night/nightArt.js`) se revisan a mano y se marcan como
`dinámico`. La revisión de dirección artística describe primero el lenguaje visual
actual (paleta y tokens, tipografía, personajes, texturas, movimiento) y después
señala las incoherencias pantalla a pantalla como hallazgos de categoría arte.

### D9. Del hallazgo al plan de fases

Los hallazgos se agrupan en cambios candidatos, cada uno con alcance, hallazgos que
cubre, severidad máxima, dependencias y nivel de riesgo. Orden por defecto: fase 2
(errores funcionales, bloqueantes primero), fase 3 (dirección artística y orden del
arte), fase 4 (optimización). La reorganización del arte va antes que la optimización
de imágenes, para no optimizar ficheros que luego se mueven o se borran. El usuario
aprueba o ajusta el plan; cada cambio aprobado se abre después con `openspec-propose`,
fuera de este cambio.

## Risks / Trade-offs

- **R1. Sin el `.env` de la tienda de desarrollo, una parte de los recorridos no se
  ejecuta** → Se declaran como `NO EJECUTADO: falta entorno E2`, el estado de cierre
  será PARTIALLY VERIFIED y `plan-fases.md` propone el entorno mínimo necesario.
- **R2. Local no es producción** (Cloudflare, catálogo real, puerta, HTTPS) → Cada
  hallazgo indica su entorno; los recorridos clave se repiten en E3 si el usuario abre
  la puerta.
- **R3. Efectos en la tienda de desarrollo** (carritos o clientes de prueba) → Solo en
  la tienda de desarrollo, nunca se paga, y `recorridos.md` lista lo que se haya creado.
- **R4. Límites de Rocky IA** (`CHAT_GLOBAL_DAILY_MAX`, modelos gratuitos) → Pocos
  mensajes y solo en E2.
- **R5. Tentación de arreglar sobre la marcha** → Prohibido en esta fase: todo se anota
  como hallazgo. CA7 lo comprueba con `git diff`.
- **R6. Auditoría larga** → Tareas por área con un punto de control tras el mapa de
  recorridos, para que el usuario confirme la cobertura antes de ejecutar.
- **R7. Afirmaciones de cobertura falsas** → La matriz se contrasta con listados
  mecánicos de rutas, features y endpoints, y la revisión independiente la verifica.

## Migration Plan

No hay despliegue ni cambios en ejecución. Deshacerlo es revertir el commit que añade
`docs/auditoria/2026-11/` y la fila de `docs/README.md`.

## Open Questions

- Qué ficha de producto y qué página legal se miden con Lighthouse: se elige una
  representativa al tomar las métricas y se anota.

## Criterios de aceptación

- **CA1. Cobertura total**: las 11 rutas, las 11 features y todos los endpoints montados
  en `server/app.mjs` aparecen en las matrices de `recorridos.md` con al menos un
  recorrido. Lo que no se pueda ejecutar lleva su motivo.
- **CA2. Recorridos completos**: cada recorrido tiene todos los campos de D3.
- **CA3. Dos viewports**: cada recorrido ejecutable en E1 se ha hecho en escritorio y
  en móvil.
- **CA4. Hallazgos accionables**: cada hallazgo tiene todos los campos de D3; los que no
  los tengan figuran como `SIN CONFIRMAR` y no cuentan como confirmados.
- **CA5. Inventario de arte completo**: el número de recursos de `arte.md` coincide con
  el que da `find` en `src/images/`, `public/`, `posters/` y `prompts-munecos/`, y los
  recursos sin referencia y los duplicados están señalados.
- **CA6. Métricas reproducibles**: comandos, versiones, commit, fecha y entorno anotados;
  Lighthouse con tres pasadas por página y viewport.
- **CA7. Sin cambios fuera de alcance**: el commit de la auditoría, medido contra su padre
  (`git show --stat <commit>`), solo toca `docs/auditoria/2026-11/`, `docs/README.md` y
  `openspec/changes/auditoria-integral-web/`, y `npm run check` sigue en verde. (Redefinido
  tras la segunda ronda de revisión: el `git diff --stat 7d2bf57` original abarcaba también
  los commits separados de otros cambios.)
- **CA8. Producción intacta**: ninguna escritura en E3 y ningún despliegue.
- **CA9. Plan aprobado**: el usuario aprueba `plan-fases.md` o sus ajustes quedan
  anotados.
- **CA10. Revisión independiente**: un revisor con contexto limpio contrasta los
  entregables con el código (cobertura, evidencias, coherencia) sin bloqueantes
  pendientes.
