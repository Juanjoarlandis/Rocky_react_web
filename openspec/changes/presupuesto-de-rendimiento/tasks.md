# Tareas: presupuesto de rendimiento

## 1. Build independiente del entorno

- [ ] 1.1 Anotar la línea base: `npm run test:run` y `npm run build` con Node 24, y guardar el número de tests y los tamaños de chunk que imprime Vite para comparar al final.
- [ ] 1.2 Añadir `envDir: false` a `vite.config.mjs` con un comentario que explique el porqué, y verificar en una copia temporal (`git archive HEAD`, con un `.env` que solo contenga `NODE_ENV=development`) que `npx vite build` genera un `dist/` idéntico por `sha256sum` al de la copia sin `.env`.
- [ ] 1.3 Verificar que `npm run test:run` sigue dando el mismo número de tests en verde y que `npm run dev:client` arranca.

## 2. Medidor

- [ ] 2.1 Escribir en `scripts/check-budget.test.mjs` las pruebas del medidor sobre un `dist/` de mentira creado en un directorio temporal, y verlas fallar: lista de JS inicial a partir del script de entrada y de los `modulepreload`, CSS inicial, chunks diferidos, suma gzip, y detección de «no hay `dist/index.html`» y de build de desarrollo.
- [ ] 2.2 Implementar en `scripts/check-budget.mjs` las funciones del medidor (sin efectos al importarlas) hasta que esas pruebas pasen.
- [ ] 2.3 Añadir pruebas, primero en rojo, y luego el lector de dimensiones: WebP VP8, VP8L y VP8X (con la bandera de animación), PNG, exclusión de SVG e ICO y error con cualquier otra extensión de imagen; las muestras se generan en la propia prueba, no se versionan binarios.

## 3. Reglas

- [ ] 3.1 Escribir las pruebas de las reglas y verlas fallar: límite superado, varias métricas fallando a la vez, excepción dentro de su techo, excepción que lo supera, excepción que ya cumple, excepción de un recurso que no existe, límite holgado más de un 10 % (con el límite propuesto en el mensaje), límite igual a su objetivo, y límite sin objetivo o por debajo de él.
- [ ] 3.2 Implementar la evaluación y el informe en castellano (tabla de métrica, medido, límite y objetivo; lista de fallos; código de salida 1) hasta que pasen.

## 4. Límites e integración

- [ ] 4.1 Crear `scripts/performance-budget.json` con los límites, objetivos y excepciones de `design.md` (D3), ajustando cada límite a lo que mida el script sobre el build de este commit, y verificar que `node scripts/check-budget.mjs` termina bien y enseña la tabla.
- [ ] 4.2 Añadir el script `budget:check` a `package.json` y meterlo en `check` después de `build`; verificar que `npm run check` termina bien.
- [ ] 4.3 Comprobar a mano que el guardián falla: copiar temporalmente una imagen de más de 1.600 px a `public/`, ejecutar `npm run build && npm run budget:check`, ver el error con el nombre y las medidas, y retirar la copia (`git status` limpio de ese fichero).
- [ ] 4.4 Documentar `npm run budget:check` y el orden nuevo de `check` en `CLAUDE.md` y `CONTRIBUTING.md`, con la regla de que el cliente no lee `.env`; verificar que los comandos documentados se ejecutan tal cual.

## 5. Cierre

- [ ] 5.1 Ejecutar `npm run check` completo con Node 24 y `npm run format:check`; comparar los chunks con los de 1.1 (deben ser idénticos: este cambio no toca `src/`).
- [ ] 5.2 Autorrevisión de `git diff` y revisión independiente contra `specs/presupuesto-de-rendimiento/spec.md`; corregir los bloqueantes y anotar el resultado aquí.
- [ ] 5.3 Añadir a `docs/auditoria/2026-11/linea-base-fase-4.md`, apartado 8, qué métricas vigila ya `npm run check` y dónde están los límites.

## Workflow follow-up

- Commit en español e imperativo cuando esté en verde; el CI repite `npm run check`.
- Archivar con `openspec-archive-change` tras VERIFIED.
