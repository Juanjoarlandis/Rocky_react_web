# Tareas: el Curioso se asoma por los cantos de los componentes

Nivel 2. TDD en cada tarea: prueba en rojo, implementación mínima, refactor en verde.

## 1. Qué vale de escondite

- [x] 1.1 Pruebas de `collectSpots`: un bloque con solo imagen de fondo no vale; con color opaco más imagen, sí. Rojo, después `hasOwnBackground`.

## 2. Tramo del canto

- [x] 2.1 Pruebas de `edgeIsPainted`: rechaza un tramo superior pintado por una imagen, una esquina a la altura de la foto y un tramo tapado por otro elemento; acepta la franja bajo la foto y una esquina sobre el papel. Rojo, después la implementación en `domProbe.js`.
- [x] 2.2 Pruebas de `choosePlacement` con filtro: descarta lo que el filtro rechaza y, sin nada válido, cae en el borde de la pantalla. Rojo, después la implementación y el paso del filtro en `CuriousPeeker.jsx`.

## 3. Verificación y cierre

- [x] 3.1 Diagnóstico en Chrome (10 rutas a 1280 px y en móvil, más la portada a 1918 px), resultado tras la ronda 2:
  - cero escondites con imagen de fondo sola;
  - cero colocaciones elegidas con el tramo pintado por una imagen o pisado por un dibujo;
  - cero colocaciones descartadas sin motivo. La sonda independiente busca el canto hacia dentro en cada rechazo. Lo ajeno solo cuenta como motivo si no es del mismo componente: la línea de la franja es de la foto.
  - la franja bajo la foto vale en 3 de 3 a 1918 px, 2 de 2 a 1280 px y 8 de 8 en móvil (antes de la ronda 2: 0, 0 y 1);
  - capturas del muñeco asomándose en la portada, Crew y Mi Crew.
- [x] 3.2 `npm run check` en verde.
- [x] 3.3 Revisión independiente (`engineering-review`), ronda 1:
  - 1 bloqueante corregido: el canto se buscaba a 4 px del rectángulo y en las tarjetas giradas se descartaban escondites buenos; ahora se busca hacia dentro, compartiendo el recorrido de `probeEdge`;
  - 1 importante corregido: los dibujos con `pointer-events: none` se comprueban por geometría;
  - menores 3–6 corregidos.
- [x] 3.4 Commit en `arreglo/curioso-por-componentes` (`e4ecf80`), integrado en `rescate/produccion-2026-09-29`.
- [x] 3.5 Revisión independiente, ronda 2 (la última), y sus correcciones en un commit nuevo:
  - `probeEdge` y la mordida no cambian: 3705 comparaciones con la versión anterior, 0 diferencias.
  - Bloqueante nuevo, corregido: la franja bajo la foto se vetaba. La línea de su canto la pinta la foto hermana, y la parada en lo ajeno la tomaba por otro elemento. Ahora el escondite guarda quién pinta su línea (`lineOwner`) y el recorrido la cruza.
  - Importante pendiente, corregido: los dibujos de una repisa son hermanos del bloque. La geometría mira los `.doodle` visibles de la página en toda la banda del canto: el ancho entero por arriba, porque la figura se agarra del 1 al 99 %.
  - Menor pendiente, corregido: nuevas pruebas para que no sobrevivan las mutaciones de quitar `stopAtForeign` y de quitar la mirada 4 px adentro.
  - Deuda sin severidad: el coste por aparición subió a unos 5,5 ms en `/crew` a 1440 px, aceptable para algo que ocurre cada 9–17 s.
