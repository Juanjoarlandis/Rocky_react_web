# Tareas: presupuesto de rendimiento

## 1. Build independiente del entorno

- [x] 1.1 Anotar la línea base: `npm run test:run` y `npm run build` con Node 24, y guardar el número de tests y los tamaños de chunk que imprime Vite para comparar al final.
  - Línea base (`80cd8cc`, copia limpia de `git archive`): 1.399 tests en 144 ficheros; 127 ficheros en `dist/`; `index` 322,95 kB (gzip 105,76), `useDocumentTitle` 47,37 (17,32), `Studio` 69,36 (20,51), `index.css` 85,16 (18,71).
- [x] 1.2 Añadir `envDir: false` a `vite.config.mjs` con un comentario que explique el porqué, y verificar en una copia temporal (`git archive HEAD`, con un `.env` que solo contenga `NODE_ENV=development`) que `npx vite build` genera un `dist/` idéntico por `sha256sum` al de la copia sin `.env`.
  - Antes: con ese `.env`, `index` de 534,37 kB y 11 ficheros con `jsxDEV`. Después: los 127 ficheros coinciden con y sin `.env`, y con la línea base. Con `NODE_ENV=development` exportado en la shell el build sigue saliendo de desarrollo: lo cubre la guarda de D6.
- [x] 1.3 Verificar que `npm run test:run` sigue dando el mismo número de tests en verde y que `npm run dev:client` arranca.
  - 1.399 tests en verde. Vite arranca y pinta la portada (probado en el puerto 3017, porque el 3000 lo ocupa otra aplicación en este equipo).

## 2. Medidor

- [x] 2.1 Escribir en `scripts/check-budget.test.mjs` las pruebas del medidor sobre un `dist/` de mentira creado en un directorio temporal, y verlas fallar: lista de JS inicial a partir del script de entrada y de los `modulepreload`, CSS inicial, chunks diferidos, suma gzip, y detección de «no hay `dist/index.html`» y de build de desarrollo.
- [x] 2.2 Implementar en `scripts/check-budget.mjs` las funciones del medidor (sin efectos al importarlas) hasta que esas pruebas pasen.
- [x] 2.3 Añadir pruebas, primero en rojo, y luego el lector de dimensiones: WebP VP8, VP8L y VP8X (con la bandera de animación), PNG, exclusión de SVG e ICO y error con cualquier otra extensión de imagen; las muestras se generan en la propia prueba, no se versionan binarios.

## 3. Reglas

- [x] 3.1 Escribir las pruebas de las reglas y verlas fallar: límite superado, varias métricas fallando a la vez, excepción dentro de su techo, excepción que lo supera, excepción que ya cumple, excepción de un recurso que no existe, límite holgado más de un 10 % (con el límite propuesto en el mensaje), límite igual a su objetivo, y límite sin objetivo o por debajo de él.
- [x] 3.2 Implementar la evaluación y el informe en castellano (tabla de métrica, medido, límite y objetivo; lista de fallos; código de salida 1) hasta que pasen.

## 4. Límites e integración

- [x] 4.1 Crear `scripts/performance-budget.json` con los límites, objetivos y excepciones de `design.md` (D3), ajustando cada límite a lo que mida el script sobre el build de este commit, y verificar que `node scripts/check-budget.mjs` termina bien y enseña la tabla.
  - Medido: JS 122,18 kB; CSS 18,52; `Studio` 20,36; fuentes 81,76; lado mayor 1.598 px; imagen más pesada 199,16 kB; imágenes 5.120,96 (5.123,41 desde que la revisión hizo pesar también el SVG y el ICO); pista 1.021,43; audio 3.701,30. Los valores de D3 valen sin cambios. Sobre el `dist/` de desarrollo que había antes del cambio, el script se negó a medir.
  - Lector de imágenes contrastado con `sharp` sobre las 90 imágenes reales del build (10 VP8, 69 VP8L, 8 VP8X, 3 PNG): 0 diferencias.
- [x] 4.2 Añadir el script `budget:check` a `package.json` y meterlo en `check` después de `build`; verificar que `npm run check` termina bien.
- [x] 4.3 Comprobar a mano que el guardián falla: copiar temporalmente una imagen de más de 1.600 px a `public/`, ejecutar `npm run build && npm run budget:check`, ver el error con el nombre y las medidas, y retirar la copia (`git status` limpio de ese fichero).
  - Con una copia de la foto de 5.906 px: «Imagen zz-prueba-presupuesto.webp: 5906 × 5906 px, por encima del límite de 1600 px de lado» y, a la vez, el total de imágenes (5.296 kB contra 5.200); código de salida 1. Retirada la copia, vuelve a 0. Repetido tras la revisión añadiendo además un `.mp4`: lo nombra con su tipo y su peso.
- [x] 4.4 Documentar `npm run budget:check` y el orden nuevo de `check` en `CLAUDE.md` y `CONTRIBUTING.md`, con la regla de que el cliente no lee `.env`; verificar que los comandos documentados se ejecutan tal cual.
  - También en la lista de comandos de `README.md`, que describía qué ejecuta `check`.

## 5. Cierre

- [x] 5.1 Ejecutar `npm run check` completo con Node 24 y `npm run format:check`; comparar los chunks con los de 1.1 (deben ser idénticos: este cambio no toca `src/`).
  - `npm run check`, repetido tras las correcciones de la revisión: 1.506 tests en 146 ficheros (los 1.399 de 1.1 más 107 nuevos), lint, lint:css, build, budget:check y security:check en verde. Los 127 ficheros de `dist/`, construidos en el repo con su `.env` local, coinciden por `sha256sum` con los de 1.1.
  - `npm run format:check` fallaba por dos ficheros ajenos al cambio: `useParedCompartida.js` (desde `2df457e`) y uno del worktree de otra sesión. Se arreglan aparte, fuera de este cambio (formato de una sentencia y `.claude/worktrees` en `.prettierignore`); después pasa y el build sigue idéntico.
- [x] 5.2 Autorrevisión de `git diff` y revisión independiente contra `specs/presupuesto-de-rendimiento/spec.md`; corregir los bloqueantes y anotar el resultado aquí.
  - Autorrevisión: una ruta de `index.html` con `%2F` podía leer fuera de `dist/`; corregido con su prueba.
  - Revisión independiente (subagente con contexto limpio, una ronda): 0 bloqueantes, 3 importantes y 11 menores. Corregidos con prueba: el JavaScript inicial sigue los imports estáticos (I1); SVG e ICO se pesan y un tipo de fichero sin regla es un fallo (I2); prueba automática de que Vite no lee `.env` y de que `check` incluye el presupuesto (I3); `index.html` sin scripts, JavaScript fuera de `assets/`, excepción que casa con varios ficheros o con techo inválido, ejecución a través de un enlace simbólico, etiquetas comentadas, errores de lectura en castellano y pruebas de frontera (M1, M3–M7, M9). Los 17 mutantes probados después caen.
  - No aplicados, anotados en `design.md` (riesgos): trinquete en los techos de las excepciones, peso del JavaScript y el CSS en línea (queda para `carga-y-estabilidad`) y unificar los recorridos de directorio de `scripts/`.
- [x] 5.3 Añadir a `docs/auditoria/2026-11/linea-base-fase-4.md`, apartado 8, qué métricas vigila ya `npm run check` y dónde están los límites.

## Workflow follow-up

- Commit en español e imperativo cuando esté en verde; el CI repite `npm run check`.
- Archivar con `openspec-archive-change` tras VERIFIED.
