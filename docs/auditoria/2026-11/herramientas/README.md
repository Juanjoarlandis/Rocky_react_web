# Herramientas de la auditoría 2026-11

Scripts con los que se generaron los documentos de esta carpeta, para poder repetir la
auditoría (sobre todo al cerrar la fase 4) y comprobar de dónde sale cada cifra. Se
guardaron aquí tras la revisión independiente: durante la auditoría vivían en una
carpeta temporal fuera del repo.

## Antes de usarlos

- **Extensión**: los ficheros JavaScript van como `*.mjs.txt` para que ESLint no los
  revise como código del proyecto. Para ejecutarlos, cópialos a una carpeta de trabajo
  fuera del repo y quita el `.txt`:
  `for f in $(find . -name '*.mjs.txt'); do mv "$f" "${f%.txt}"; done`.
- **Rutas**: se han sustituido las rutas de la máquina original por marcadores:
  `/RUTA/AL/REPO` (este repositorio), `/RUTA/AL/SCRATCH` (la carpeta de trabajo donde
  copies las herramientas), `/RUTA/A/node24` (un Node 24) y `/RUTA/AL/HOME`. Cámbialos
  antes de ejecutar; los principales están en `e1/harness.mjs` y `e2sim/start-e2sim.mjs`.
  `IP-LOCAL-DEL-EQUIPO` (en `e1/transversales/gate.mjs`) es una IP del propio equipo que
  no sea loopback, para la prueba de R-SYS-02 cuando no existe la pasarela de Docker.
- **Dependencias** (en la carpeta de trabajo, no en el repo): `npm i playwright@1.64.1`
  en `e1/`; Google Chrome del sistema (`channel: 'chrome'`); `ffmpeg`/`ffprobe` para el
  inventario de arte y las capturas; `npx lighthouse@13.5.0` para las métricas.
- Ninguna herramienta lee `.env`: las instancias fijan las variables de `.env.example`
  (y vacían las de credenciales) para que E1 sea siempre E1.

## Qué hay

| Ruta | Para qué |
| --- | --- |
| `e1/harness.mjs.txt` | Arnés común: instancia aislada de Express con el build de `dist/`, viewports, recogida de errores de consola y red, capturas y registro de resultados. |
| `e1/<área>/*.mjs.txt` | Recorridos de E1 por área (estructura, catálogo, carrito y chat, estudio, noche y música, transversales). |
| `e1/lh-run.mjs.txt` + `lighthouse.sh` | Segunda tanda de Lighthouse (`metricas.md`, apartado 2.1). |
| `lighthouse-medianas.py` | Medianas por página y viewport a partir de los JSON de Lighthouse. |
| `e1/arte-capturas.mjs.txt` | Capturas de la revisión de arte en los cortes 480–1440, de día y de noche. |
| `e2sim/` | Doble local de Shopify (Storefront, Customer Accounts, Admin, webhooks firmados) y de OpenRouter para E2 simulado; su `README.md` explica qué simula y qué no. |
| `e2/*.mjs.txt` | Recorridos de E2 simulado. |
| `inventario_arte.py`, `arte_md.py` | Inventario de arte de `arte.md`. |
| `montar_recorridos.py` | Montaje de `recorridos.md` y de la sección de candidatos. |
| `volcar_resultados.py`, `volcar_resultados_v2.py` | Volcado de resultados a `ejecucion.md`, `recorridos.md` y `hallazgos.md` (la v2 aplica el criterio OK/FALLO corregido tras la revisión). |
| `plan.py` | Reparto de hallazgos en cambios y generación de `plan-fases.md`. |
| `datos/` | Registros en bruto de la ejecución (`*.tsv`), medianas de Lighthouse, inventario de arte e índice de hallazgos. |

## Evidencia que no se ha conservado

Para no llenar el repo de binarios ni de datos efímeros, no se guardaron: las 114
capturas PNG de la ejecución (solo las 32 de `capturas/`, en WebP), los JSON completos de
las 60 pasadas de Lighthouse de cada tanda, las observaciones en bruto de Playwright
(`out/`, `obs/`), los certificados autofirmados y el estado cifrado del doble de E2. Las
referencias a `capturas-e1/…` y `scratchpad/…` de los documentos apuntan a esa carpeta
temporal; lo esencial de cada una está descrito en el texto de su evidencia.
