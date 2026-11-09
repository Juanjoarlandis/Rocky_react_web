# Tareas: el Curioso se asoma por los cantos de los componentes

Nivel 2. TDD en cada tarea: prueba en rojo, implementación mínima, refactor en verde.

## 1. Qué vale de escondite

- [x] 1.1 Pruebas de `collectSpots`: un bloque con solo imagen de fondo no vale; con color opaco más imagen, sí. Rojo, después `hasOwnBackground`.

## 2. Tramo del canto

- [x] 2.1 Pruebas de `edgeIsPainted`: rechaza un tramo superior pintado por una imagen, una esquina a la altura de la foto y un tramo tapado por otro elemento; acepta la franja bajo la foto y una esquina sobre el papel. Rojo, después la implementación en `domProbe.js`.
- [x] 2.2 Pruebas de `choosePlacement` con filtro: descarta lo que el filtro rechaza y, sin nada válido, cae en el borde de la pantalla. Rojo, después la implementación y el paso del filtro en `CuriousPeeker.jsx`.

## 3. Verificación y cierre

- [x] 3.1 Diagnóstico en Chrome (10 rutas, escritorio y móvil), resultado:
  - cero escondites con imagen de fondo sola;
  - cero colocaciones elegidas con el tramo pintado por una imagen;
  - cero colocaciones descartadas sin motivo: una sonda independiente busca el canto hacia dentro en cada rechazo, que es el criterio que se añadió tras la revisión;
  - capturas del muñeco asomándose en la portada, Crew y Mi Crew.
- [ ] 3.2 `npm run check` en verde.
- [x] 3.3 Revisión independiente (`engineering-review`), ronda 1:
  - 1 bloqueante corregido: el canto se buscaba a 4 px del rectángulo y en las tarjetas giradas se descartaban escondites buenos; ahora se busca hacia dentro, compartiendo el recorrido de `probeEdge`;
  - 1 importante corregido: los dibujos con `pointer-events: none` se comprueban por geometría;
  - menores 3–6 corregidos.
  La ronda 2 se limita a esas correcciones.
- [ ] 3.4 Commit en `arreglo/curioso-por-componentes`.
