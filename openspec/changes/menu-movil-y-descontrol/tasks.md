# Tareas: menú móvil que se cierra y descontrol que lleva a la portada

Nivel 2. TDD en cada tarea: prueba en rojo, implementación mínima, refactor en verde.

## 1. Bloqueo de scroll (H-010)

- [x] 1.1 Pruebas del hook: bloquea `<html>` y no toca el `body`; restaura los valores previos al soltar; dos bloqueos solapados solo liberan al soltar el último (escenarios «Capas solapadas» y «Cerrar devuelve la página donde estaba»). Rojo, después implementación en `useLockBodyScroll.js`.
- [x] 1.2 La intro usa el hook en lugar de su bloqueo propio; prueba de que intro y menú solapados no dejan la página bloqueada.
- [x] 1.3 Ajustar las tres pruebas que comprobaban `body.style.overflow` (hook, `NavBar` y `Lightbox`) para que comprueben el bloqueo en `<html>` y que el `body` no se toca.
- [x] 1.4 Verificación en navegador real (Chrome): a 375 px con arrastres táctiles, hoja abierta tras bajar, barra visible y botón que cierra; deslizar no mueve la página; al cerrar sigue en su sitio. Lo mismo con el lightbox (táctil a 375 px y rueda en escritorio) y con la intro (rueda).

## 2. Cierre desde dentro de la hoja (H-014)

- [x] 2.1 Pruebas: el diálogo contiene «Cerrar», entra en el ciclo de Tab, cierra y devuelve el foco; Escape sigue cerrando. Rojo, después implementación en `NavBar.jsx` y estilo de foco visible en `navbar.css`.

## 3. Descontrol → portada

- [x] 3.1 Pruebas de `Descontrol`: llama a `onActivated` al terminar el rótulo, no lo llama si se apaga a mitad, lo llama al instante con movimiento reducido y no lo llama al llegar ya de noche. Rojo, después implementación.
- [x] 3.2 Pruebas de `App`: encender fuera de la portada (`/legal/privacidad`, ruta sin carga diferida; `/estudio` se comprueba en 1.4) acaba en `/`; encender en `/` no añade historial. Rojo, después implementación.
- [x] 3.3 Pruebas de `NavBar`: encender desde la hoja la cierra; apagar desde la hoja no. Rojo, después implementación.

## 4. Cierre

- [x] 4.1 `npm run check` en verde.
- [x] 4.2 Revisión independiente (skill `engineering-review`) y corrección de bloqueantes.
- [ ] 4.3 Commit, push y publicación en la Raspberry con `release:preparar` / `release:promover` (autorizado por el usuario el 2026-11-08), con simulacro previo.
