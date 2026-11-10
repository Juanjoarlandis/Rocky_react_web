# Propuesta: presupuesto de rendimiento en `npm run check`

## Why

La línea base de la fase 4 (`docs/auditoria/2026-11/linea-base-fase-4.md`) muestra que,
desde la auditoría, el JavaScript común ha crecido un 10 % (336,8 → 370,4 kB) y el CSS
común un 28 % (66,4 → 85,2 kB) sin que nada avisara, y que siguen en el repo dos fotos de
5906 × 5906 px y dos animaciones de más de 650 kB. Antes de optimizar hace falta un
guardián: que `npm run check`, y con él el CI, falle cuando el build o los recursos se
pasen de lo acordado, para que cada mejora de los cambios siguientes quede fijada y no se
pierda en el siguiente commit.

Además, hoy `npm run build` no es fiable en local: si el `.env` del equipo fija
`NODE_ENV=development`, Vite genera React de desarrollo (534 kB de `index` en vez de
323 kB). Sin un build reproducible no hay nada que medir.

Es el primer cambio de la fase 4 y es de nivel 2.

## What Changes

- **El build de producción deja de depender del `.env` local.** El cliente no usa
  ninguna variable de entorno, así que Vite deja de leer ese fichero.
- **Nuevo `npm run budget:check`**, que mide el `dist/` recién construido y falla, con un
  informe en castellano, si se supera algún límite:
  - JavaScript inicial (los scripts de `index.html`, los módulos que precarga y lo que
    importan de forma estática, en gzip).
  - CSS inicial (gzip).
  - Mayor chunk diferido de JavaScript (gzip).
  - Fuentes que precarga `index.html`.
  - Lado mayor y peso de cada imagen, y peso de cada pista de audio.
  - Peso total de imágenes y de audio.
  - Cualquier fichero de un tipo para el que no hay regla (un vídeo, un JPEG) es un fallo.
- **Los límites viven en un fichero versionado**, cada uno con su objetivo de la fase 4.
  Arrancan en la cifra de hoy y solo bajan: cuando una medida queda claramente por debajo
  de su límite, la comprobación falla y pide bajarlo.
- **Excepciones declaradas y con caducidad** para lo que hoy ya se pasa (las dos fotos de
  5906 px, las dos animaciones y `barro.m4a`): cada una con su propio techo, y la
  comprobación falla si la excepción ya no hace falta.
- **`npm run check` lo ejecuta después del build**, así que el CI lo hereda sin tocar el
  workflow.

## Capabilities

### New Capabilities

- `presupuesto-de-rendimiento`: límites de peso del build y de los recursos, cómo se
  miden y cuándo hacen fallar la comprobación del proyecto.

### Modified Capabilities

Ninguna (`openspec/specs/` está vacío).

## Fuera de alcance

- Bajar cualquier cifra: eso lo hacen `imagenes-y-medios`, `carga-y-estabilidad` y los
  demás cambios de la fase 4, que irán apretando los límites y retirando excepciones.
- Lighthouse, la traza de navegador, el contenedor limitado y las escrituras del almacén
  no entran en `npm run check`: tardan minutos y dependen del equipo. Se repiten con
  `docs/auditoria/2026-11/herramientas/fase4/` al cerrar cada cambio.
- Cambiar el workflow del CI o añadir dependencias.

## Supuestos

- El cliente seguirá sin leer variables de entorno en el build. Si algún día necesita
  una, se le pasará de forma explícita y no desde el `.env` del servidor, que contiene
  secretos.
- Los tests ya no dependen del `.env` local: el `Dockerfile` los ejecuta sin él.

## Impact

`vite.config.mjs`, `package.json` (scripts `budget:check` y `check`), un script y su
fichero de límites nuevos en `scripts/`, con sus pruebas, `CLAUDE.md`, `CONTRIBUTING.md`
y `README.md` (lista de comandos), y `docs/auditoria/2026-11/linea-base-fase-4.md` (qué
vigila ya `check`). Sin cambios en `src/`, `server/` ni `shared/`, ni
en el comportamiento de la web. Sin dependencias nuevas.
