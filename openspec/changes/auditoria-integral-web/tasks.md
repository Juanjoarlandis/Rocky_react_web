# Tareas: auditoría integral de la web (fase 1)

Regla de toda la fase: no se modifica nada fuera de `docs/auditoria/2026-11/`,
`docs/README.md` y `openspec/` (design.md, R5 y CA7).

## 1. Preparación y entornos

- [x] 1.1 Crear `docs/auditoria/2026-11/README.md` con alcance, entorno (fecha, commit `7d2bf57`, Node, versión de Chrome, viewports) y la leyenda de estados, y añadir la fila de `auditoria/` a `docs/README.md`; verificar que el índice enlaza la carpeta.
- [x] 1.2 Arrancar E1 (`npm run dev`) y consultar `/api/health` y `/api/shopify/status`; verificar que la portada carga en `http://localhost:3000` y anotar en el README qué integraciones están configuradas.
- [x] 1.3 Preguntar al usuario si prepara el `.env` de E2 (tienda de desarrollo y OpenRouter `:free`) y si abrirá la puerta de producción para E3; verificar que el README deja escrito qué entornos hay y qué recorridos quedan sin ejecutar por falta de entorno.

## 2. Mapa de recorridos (punto de control)

- [x] 2.1 Sacar los listados mecánicos de rutas (`src/App.jsx`), features (`src/features/`) y endpoints montados (`server/app.mjs` y `server/http/routes/`) y copiarlos con sus comandos en un apéndice de `recorridos.md`; verificar que los recuentos coinciden con los del código (11 rutas, 11 features y el número real de endpoints).
- [x] 2.2 Escribir los recorridos de estructura y navegación (intro, NavBar, Footer, scroll, StreetWall, CuriousPeeker, Estampida, 404 y páginas legales) con todos los campos de D3; verificar que cada componente de `src/components/` y esas features aparecen al menos una vez.
- [x] 2.3 Escribir los recorridos de catálogo y drops (listado, categorías, ficha, lightbox, menú drop, contador de diseños, calendario `.ics` y alta en avisos); verificar que cubren `src/features/catalog/`, `/api/drop` y `/api/avisos`.
- [x] 2.4 Escribir los recorridos de carrito, paso a checkout y cuenta de cliente; verificar que cubren `src/features/cart/`, `src/features/storefront/` y los endpoints de `/api/shopify` (catalog, cart, checkout y account).
- [x] 2.5 Escribir los recorridos de Rocky IA, Crew y Mi Crew; verificar que cubren `src/features/chat/`, `src/features/crew/` y los endpoints de chat y crew.
- [x] 2.6 Escribir los recorridos del estudio de beats (secuenciador, pads, publicar, ranking, reproducir y borrar); verificar que cubren `src/features/studio/` y todos los endpoints de `beats.mjs`.
- [x] 2.7 Escribir los recorridos del modo noche y Descontrol (spray, grafiti, linterna, compartir imagen) y de la música (Boombox, MiniPlayer); verificar que cubren `src/features/night/` y `src/features/music/`.
- [x] 2.8 Escribir los recorridos transversales: puerta de acceso, health, webhooks (revisión por código y tests) y respuestas de error (origen no permitido, límite de peticiones, Shopify no disponible); verificar que cada endpoint restante del apéndice tiene recorrido.
- [x] 2.9 Completar las matrices rutas × recorridos, features × recorridos y endpoints × recorridos y comprobar que no queda ninguna fila vacía (CA1); presentar el mapa al usuario y anotar en `recorridos.md` su conformidad o los ajustes que pida.

## 3. Ejecución en local sin credenciales (E1)

- [x] 3.1 Ejecutar en escritorio (1440 px) todos los recorridos de E1 registrando resultado, errores de consola y peticiones fallidas; verificar que ningún recorrido de E1 queda sin resultado en `recorridos.md`.
- [x] 3.2 Ejecutar los mismos recorridos en móvil (375 × 812) y registrar las diferencias; verificar que cada recorrido de E1 tiene resultado en los dos viewports (CA3).
- [x] 3.3 Hacer la pasada de teclado en cada pantalla (foco visible, orden de tabulación y Escape en modales y menús); verificar que cada pantalla tiene su resultado anotado.
- [x] 3.4 Registrar en `hallazgos.md` los hallazgos funcionales y de accesibilidad de E1 con todos los campos de D3 y una captura por fallo visual; verificar que cada `FALLO` de `recorridos.md` enlaza al menos un hallazgo (CA4).

## 4. Ejecución con credenciales (E2) y en producción (E3)

- [x] 4.1 Si hay E2: ejecutar carrito, paso a checkout sin pagar, cuenta de cliente si el origen lo permite, Crew y Rocky IA, en escritorio y móvil; verificar que cada recorrido tiene resultado y que `recorridos.md` lista los datos creados en la tienda de desarrollo. Si no hay E2, verificar que todos quedan como `NO EJECUTADO: falta entorno E2`.
- [ ] 4.2 Si el usuario abre la puerta: repetir en E3 solo los recorridos clave de lectura (portada, catálogo, ficha, menú drop, legal y 404); verificar que no se ha lanzado ninguna escritura (CA8) y anotar las diferencias con E1.
- [ ] 4.3 Registrar en `hallazgos.md` los hallazgos de E2 y E3 indicando el entorno; verificar que cumplen CA4.

## 5. Dirección artística

- [x] 5.1 Generar el inventario mecánico de `src/images/`, `public/`, `posters/` y `prompts-munecos/` (ruta, formato, medidas y peso) desde una carpeta temporal fuera del repo y copiar la tabla y el comando en `arte.md`; verificar que el número de filas coincide con el `find` de esas carpetas (CA5).
- [x] 5.2 Marcar el uso de cada recurso (`referenciado`, `dinámico` revisado a mano o `sin referencia`), los duplicados por hash y el cumplimiento de la nomenclatura; verificar que ningún recurso queda sin clasificar.
- [x] 5.3 Describir en `arte.md` el lenguaje visual actual (paleta y tokens de `00-tokens.css`, tipografía, personajes, texturas y movimiento); verificar que cada afirmación cita el token, el fichero o la captura en que se apoya.
- [x] 5.4 Revisar cada pantalla en 480, 640, 900, 1200 y 1440 px, guardar en `capturas/` como mucho 40 capturas WebP de 150 kB o menos, y registrar los hallazgos de arte; verificar los límites de las capturas con `find` y `du`, y que cada hallazgo de arte enlaza su captura.

## 6. Métricas de partida

- [x] 6.1 Ejecutar `npm run build` y copiar a `metricas.md` los tamaños por chunk (bruto y gzip); verificar que coinciden con la salida del build.
- [x] 6.2 Pasar `npx lighthouse@13.5.0` con Chrome del sistema contra el build servido en local, tres pasadas por página en móvil y escritorio, con las 10 páginas de D6; verificar que `metricas.md` recoge la mediana de las cuatro categorías y de LCP, CLS y TBT por página y viewport, con los comandos exactos (CA6).
- [x] 6.3 Anotar los bytes de imagen por página, las cabeceras de caché y compresión de los estáticos de producción (`curl -I`, solo lectura) y el resultado de `npm audit`; verificar que cada dato lleva su comando y que los problemas pasan a `hallazgos.md` como rendimiento, SEO u operación.

## 7. Consolidación y plan de fases

- [x] 7.1 Ordenar `hallazgos.md` por severidad, fusionar duplicados, marcar los `SIN CONFIRMAR` y resumir las cifras en el README; verificar que cada hallazgo confirmado tiene todos los campos de D3.
- [x] 7.2 Escribir `plan-fases.md` siguiendo D9 (cambios candidatos con alcance, hallazgos, severidad máxima, dependencias y nivel de riesgo); verificar que todos los hallazgos confirmados están en algún cambio o descartados con motivo.
- [x] 7.3 Presentar el plan al usuario y anotar en `plan-fases.md` su aprobación o sus ajustes; verificar que queda la fecha y la decisión (CA9).

## 8. Verificación y cierre

- [x] 8.1 Comprobar CA7: el commit de la auditoría, contra su padre (`git show --stat <commit>`), solo toca `docs/auditoria/2026-11/`, `docs/README.md` y `openspec/changes/auditoria-integral-web/`, y `npm run check` está en verde.
- [x] 8.2 Pasar la revisión independiente (`engineering-review`) de los entregables frente al código, con dos rondas como máximo; verificar que no quedan bloqueantes (CA10).
- [x] 8.3 Emitir el informe de cierre de `definition-of-done.md` con cada criterio de aceptación y su evidencia; verificar que el estado (VERIFIED, PARTIALLY VERIFIED o BLOCKED) está justificado.

## Workflow follow-up

- Hacer commit de los entregables cuando el usuario lo autorice.
- Archivar con `openspec-archive-change` solo con estado VERIFIED y conformidad del usuario.
- Abrir con `openspec-propose` los cambios de las fases 2–4 que el usuario apruebe en `plan-fases.md`.
