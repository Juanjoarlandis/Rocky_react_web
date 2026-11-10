# Tareas: carga y estabilidad

## 1. Línea base

- [ ] 1.1 Ejecutar `npm run test:run` con Node 24 y anotar aquí el número de tests; repetir el build limpio, `composicion-chunk.mjs`, la traza de navegador y Lighthouse (`docs/auditoria/2026-11/herramientas/fase4/`) sobre el commit de partida, y sacar capturas de referencia de las once rutas en 375 y 1440 px, de día y de noche.

## 2. Piezas diferidas

- [ ] 2.1 Escribir en `src/App.test.jsx` las pruebas y verlas fallar: de día y sin interacción no se ha cargado el módulo del spray; tras el reposo se han pedido las piezas diferidas; teclear «035» lanza la Estampida; un chunk diferido que falla no deja la página en blanco.
- [ ] 2.2 Diferir `Descontrol` con su precarga en reposo y al acercar puntero o foco a la bombilla; verificar los dos escenarios de la bombilla (tras cinco segundos y nada más cargar) y anotar el JS y el CSS inicial que da el build.
- [ ] 2.3 Diferir `CuriousPeeker`, `CartRunner`, `Estampida` (con la escucha de «035» en `App`), `Lightbox` y `NotFound`, midiendo tras cada uno; las pruebas existentes de esos componentes siguen en verde.
- [ ] 2.4 Si el JS inicial sigue por encima de 100 kB gzip, aplicar las palancas siguientes de D1 en su orden y anotar cuál hizo falta; verificar con `npm run budget:check`.

## 3. Fuentes

- [ ] 3.1 Quitar de `index.html` la precarga de Fredoka; medir el LCP de `/` en móvil con Lighthouse (mediana de tres) precargando Luckiest Guy y Archivo, y solo Luckiest Guy; dejar la mejor, anotar las dos medidas y comprobar que el texto del pie y de los avisos sigue saliendo con su fuente.

## 4. Estabilidad

- [ ] 4.1 Añadir pruebas, primero en rojo, de que el aviso de carga de la ruta y los de `Muro` y `ProductDetail` usan el mismo contenedor con alto reservado, y de que las imágenes del 404, del estudio y del desfile declaran medidas; implementar D3.
- [ ] 4.2 Verificar con Lighthouse en móvil y escritorio que el CLS de las diez páginas es 0,05 o menos y que el elemento LCP de `/estudio`, `/crew` y `/cart` ya no es la ilustración del pie; comparar capturas de las páginas cortas (404, carrito vacío, legal) en los cuatro cortes.

## 5. Primera vista

- [ ] 5.1 Pruebas en `ProductPage.test.jsx`, primero en rojo: la prioridad alta va a la primera foto de producto aunque el catálogo empiece por un cartel o una cabecera; la primera fila es `eager` con y sin intro. Implementar D4.
- [ ] 5.2 Probar la precarga de las tres peticiones de arranque en `index.html` y medir el LCP de `/` y `/menudrop` con y sin ella (mediana de tres); conservarla solo si mejora, y anotar las medidas.

## 6. Modo neón

- [ ] 6.1 Ampliar `traza-navegador.mjs` para medir el neón en reposo desactivando, de uno en uno, `tubo-roto`, `.uv-wall`, `.uv-oscuridad` y el lienzo del spray; anotar aquí la tabla y qué causa el recálculo por fotograma.
- [ ] 6.2 Corregir la causa (D5) y verificar los dos escenarios de reposo de `specs/coste-en-ejecucion/spec.md`, con capturas y un vídeo corto de antes y después del parpadeo de los títulos.
- [ ] 6.3 Pruebas en `Spray.test.jsx`, primero en rojo: de noche sin coger el bote y sin trazos no hay lienzo; con trazos propios o compartidos sí; al soltar el bote sin nada pintado se libera. Implementar.
- [ ] 6.4 Cambiar la linterna para que mueva una capa compuesta y verificar los escenarios de puntero y de scroll (43 % y 74 % de un núcleo como máximo en escritorio); las pruebas de `torch.js` y de `Descontrol` siguen en verde.
- [ ] 6.5 Prueba en `useNightMode.test.js`, primero en rojo, de que catorce suscriptores crean un solo observador y todos reciben el cambio; implementar D6.

## 7. Estudio

- [ ] 7.1 Medir con la traza, mientras suena la mesa, de dónde salen los layouts (registro de `Layout` con su pila) y anotarlo aquí.
- [ ] 7.2 Pruebas, primero en rojo, de que avanzar un paso no vuelve a pintar la consola, los pads ni los controles (contando renders con un espía), y de que `matchMedia` no se llama en cada fotograma; implementar D7 sin tocar las pruebas existentes de la mesa.
- [ ] 7.3 Verificar el escenario «mesa sonando» (20 % o menos del hilo en móvil ×4, sin tareas de más de 50 ms).
- [ ] 7.4 Pruebas en `engine.test.js` y `useRankingPlayer.test.js`, primero en rojo: mesa y ranking reciben el mismo contexto; se cierra al soltarlo el último; «Remezclar» no crea otro. Implementar D8.

## 8. Perfil Crew, presupuesto y cierre

- [ ] 8.1 Prueba en `useCrewProfile.test.js`, primero en rojo, de que el objeto devuelto es el mismo entre renders sin cambios; implementar D9.
- [ ] 8.2 Bajar en `scripts/performance-budget.json` los límites de JS inicial, CSS inicial y fuentes precargadas a lo medido, y verificar `npm run check`.
- [ ] 8.3 Repetir Lighthouse y la traza completas y anotar en `linea-base-fase-4.md` las cifras nuevas frente a los presupuestos; lo que no se alcance, con su medida y su causa.
- [ ] 8.4 Comparar las capturas de 1.1 una a una; `npm run check`; autorrevisión de `git diff` y revisión independiente contra las dos especificaciones. Anotar el resultado aquí.

## Workflow follow-up

- Archivar con `openspec-archive-change` tras VERIFIED.
