# Auditoría integral de la web — noviembre de 2026

Fase 1 del plan de revisión de ROCKY 035: inventario de todo lo que puede hacer un
usuario, ejecución de esos recorridos, revisión de dirección artística y métricas de
partida. **No cambia código**: solo observa y deja hallazgos para las fases 2–4.

Plan y criterios de aceptación: `openspec/changes/auditoria-integral-web/`
(`proposal.md`, `design.md` y `tasks.md`).

## Documentos

| Fichero | Contenido |
| --- | --- |
| [`recorridos.md`](recorridos.md) | Mapa de recorridos de usuario y matrices de cobertura. |
| [`ejecucion.md`](ejecucion.md) | Resultado de cada recorrido por viewport, pasada de teclado, excepciones y fichas corregidas. |
| [`hallazgos.md`](hallazgos.md) | Hallazgos ordenados por severidad. |
| [`arte.md`](arte.md) | Inventario de arte y revisión de dirección artística. |
| [`metricas.md`](metricas.md) | Métricas de partida y comandos para repetirlas. |
| [`plan-fases.md`](plan-fases.md) | Hallazgos agrupados en cambios candidatos para las fases 2–4. |
| [`linea-base-fase-4.md`](linea-base-fase-4.md) | Línea base de rendimiento del commit `7effff4` (2026-11-10), antes de la fase 4: build, Lighthouse, navegador, servidor en contenedor limitado y almacén. |
| `capturas/` | Capturas que respaldan hallazgos y la revisión de arte. |
| [`herramientas/`](herramientas/README.md) | Scripts con los que se generó todo (Playwright, doble de Shopify y OpenRouter, Lighthouse, inventario, montaje). |

## Versión auditada

| Dato | Valor |
| --- | --- |
| Fecha de inicio | 2026-11-08 |
| Commit | `7d2bf57` (rama `rescate/produccion-2026-09-29`), idéntico en código a la release de producción `20260929T100641Z-el-toxico-5617951b` |
| Node | 24.11.0 (producción usa 24.19.0) |
| Navegador de recorridos | Playwright 1.64.1 con Google Chrome 157 (ver `design.md`, D5); el navegador integrado de la app (Chromium 152) solo se usó para la primera comprobación de E1 |
| Navegador de métricas | Google Chrome 157.0.8103.38 |
| Viewports | Escritorio 1440 px; móvil 375 × 812; cortes de arte 480, 640, 900 y 1200 px |

## Entornos

| Id | Estado | Detalle |
| --- | --- | --- |
| E1 | **Disponible** | Local sin `.env`. Vite en `http://localhost:3002` (el 3000 lo ocupa otro servicio de la máquina) y Express en `3001`, arrancados con `PORT=3001 PUBLIC_ORIGIN=http://localhost:3002 API_ALLOWED_ORIGINS=http://localhost:3002 npx concurrently "npx vite --port 3002 --strictPort" "node server/index.mjs"`. `/api/health` → `{"status":"ok"}`. `/api/shopify/status` → `mode: "demo"`, con `catalog`, `cart`, `customerAccounts`, `admin` y `webhooks` a `false`. Rocky IA sin `OPENROUTER_API_KEY`. |
| E2 | **Simulado** (decisión del usuario del 2026-11-08: «créalo tú o simúlalo») | No hay credenciales reales. El servidor real de la web arranca con un módulo de precarga que sustituye `fetch` y responde con un doble local de Shopify (Storefront, Customer Accounts, Admin, webhooks firmados con un secreto de prueba) y de OpenRouter; cualquier otra salida a internet falla. Cuenta de cliente por HTTPS local con certificado autofirmado. Verificado con 32 comprobaciones de punta a punta. Los resultados se marcan `E2 simulado`: prueban la lógica de la web, no el comportamiento real de Shopify ni la calidad del modelo (simplificaciones: catálogo fijo de 10 productos en EUR, sin impuestos ni envío, sin pantallas de login de Shopify, respuestas de IA por plantilla). **Incidente**: en la primera verificación del doble, el navegador de pruebas llegó 5 veces a `shopify.com/authentication/…` con valores ficticios (client_id de prueba, redirección a localhost); respondió «Store unavailable». Corregido con una barrera de red en el navegador; las verificaciones posteriores no registran salidas. |
| E3 | **El usuario abrirá la puerta** cuando se le avise (respuesta del 2026-11-08) | Solo lectura: portada, catálogo, ficha, menú drop, legal y 404. Sin carrito, avisos, chat, beats ni Crew. |

## Leyenda

- Resultado de recorrido: `OK` (comportamiento correcto) · `FALLO` (reproduce un hallazgo confirmado o algo se rompe) · `NO EJECUTADO: <motivo>` · `PENDIENTE`. Criterio corregido tras la revisión independiente: ver `ejecucion.md`.
- Severidad de hallazgo: **bloqueante** (impide un recorrido o rompe la web),
  **importante** (degrada claramente la experiencia, el rendimiento o el arte),
  **menor** (pulido).
- Hallazgos `SIN CONFIRMAR`: sospechas sin reproducción ni evidencia; no cuentan como
  confirmados.

## Estado

Cifras al consolidar (tarea 7.1, 2026-11-08):

| Qué | Cifra |
| --- | --- |
| Recorridos mapeados | 254 (E1 183 · E2 58 · E3 3 · código y tests 10) |
| Recorridos con resultado | 252: E1 y código/tests completos, E2 completo **simulado**, E3 pendiente (R-CART-23, R-ACC-11; R-SYS-02 simulado en local) |
| Ejecuciones registradas | 445 por ficha y viewport + 35 pasadas de teclado: 151 OK · 313 FALLO · 16 NO EJECUTADO (`ejecucion.md`) |
| Fichas corregidas al ejecutar | 33 (el esperado no coincidía con el código) |
| Hallazgos confirmados | **175**: 1 bloqueante · 39 importantes · 135 menores |
| Por fase propuesta | Fase 2: 146 · Fase 3: 10 · Fase 4: 19 |
| Candidatos e IDs revisados | 229 → 219 integrados, 3 descartados, 7 pendientes (Shopify real, navegador o móvil real, E3) |
| Rendimiento móvil (Lighthouse, local) | 50–75; LCP 5,2–10,6 s; CLS hasta 0,454 (0,522 en escritorio) |
| Dependencias | 15 vulnerabilidades (4 en producción) al auditar; 0 tras el cambio `dependencias-y-ci` |

Bloqueante: **H-007** (las páginas legales publican «PENDIENTE» en lugar del titular, NIF y
domicilio). **H-008** (el catálogo vivo solo carga 8 productos) quedó como importante tras la
revisión independiente: pasa a bloqueante si la tienda real publica más de 8.

## Cierre (tarea 8.3, 2026-11-08)

**IMPLEMENTACIÓN.** Auditoría de solo lectura: documentos de esta carpeta, sus capturas y
herramientas, una fila en `docs/README.md` y el cambio `openspec/changes/auditoria-integral-web`.
Sin cambios de código.

**VERIFICACIÓN.**

| Criterio | Evidencia | Estado |
| --- | --- | --- |
| CA1 Cobertura total | 11 rutas, 11 features, 25 endpoints y 7 manejadores con recorrido; matrices de `recorridos.md` sin filas vacías (confirmado por la revisión independiente) | Cumple |
| CA2 Recorridos completos | 254 fichas con todos los campos de D3 | Cumple |
| CA3 Dos viewports | Todo E1 en escritorio y móvil salvo las excepciones con motivo de `ejecucion.md` («Excepciones de viewport») | Cumple con excepciones declaradas |
| CA4 Hallazgos accionables | 175 confirmados con los diez campos de D3; los no confirmados, aparte | Cumple |
| CA5 Inventario de arte | 231 filas = `find` | Cumple |
| CA6 Métricas reproducibles | Comandos, versiones, fecha, entorno y medianas de Lighthouse en `metricas.md`; scripts en `herramientas/` | Cumple |
| CA7 Sin cambios fuera de alcance | El commit de la auditoría solo toca sus rutas (`git show --stat`); `npm run check` en verde (670 tests, lint, build, escáner) | Cumple |
| CA8 Producción intacta | En producción solo `GET`/`HEAD` de lectura con `curl`; ningún despliegue | Cumple |
| CA9 Plan aprobado | `plan-fases.md`, aprobado el 2026-11-08 con las decisiones D1–D7 | Cumple |
| CA10 Revisión independiente | Dos rondas. Primera: 1 bloqueante, 4 importantes y 10 menores, todos tratados. Segunda: bloqueante corregido; su importante (CA7) y sus menores, corregidos o registrados (H-175) | Cumple |

**CALIDAD.** Revisor: subagente con contexto limpio, dos rondas (límite). Resueltos: commits
separados por cambio, criterio OK/FALLO unificado (313 ejecuciones en FALLO, todas con
hallazgo), H-008 rebajado con su condición, H-174 y H-175 nuevos, referencias y textos
corregidos, herramientas guardadas en el repo. Limitaciones: E2 es **simulado** (no prueba el
comportamiento real de Shopify ni la calidad del modelo); las métricas son locales, sin
Cloudflare; quedan 7 IDs pendientes de Shopify real, de móvil o navegador reales o de E3.
Incidente registrado: en la preparación del doble de E2, el navegador de pruebas llegó cinco
veces a la página de login real de Shopify con valores ficticios (ver «Entornos»).

**ESTADO: PARTIALLY VERIFIED** — falta E3 (tareas 4.2 y 4.3: R-CART-23 y R-ACC-11 en
producción, con la puerta abierta por el usuario); el resto de criterios está cumplido.
