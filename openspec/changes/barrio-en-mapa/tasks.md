# Tareas: el barrio en un mapa

Nivel 2 con decisiones visuales y de producto. No se implementa hasta que el usuario apruebe
el prototipo `docs/design/barrio-en-mapa-preview.html`. TDD en cada tarea: prueba en rojo por
la razón esperada, implementación mínima, refactor en verde. Antes de empezar, línea base:
`npm run test:run` y `npm run budget:check`.

**Segunda versión (2026-11-11).** El usuario corrigió el alcance: el mapa sigue el plano real de
Lacoma y los sitios son los cuatro que él dio. Las tareas que dependían del dibujo inventado o de
los seis sitios se reabren o se sustituyen. Lo que no cambia sigue hecho: la cabeza común, el
diálogo, el foco, el botón del pie y el 404 de noche. El historial de la primera versión está al
final.

## 0. Aprobación

- [x] 0.1 El usuario aprueba el primer prototipo. Aprobado el 2026-11-11 («Apruebo el mapa») y corregido después por el propio usuario (ver arriba).
- [x] 0.2 El usuario aprueba el segundo prototipo: el plano real, los cuatro sitios en su punto, los nombres de las tarjetas y qué abre cada uno (propuesta, «Supuestos»). Verificación: su respuesta en la conversación; los cambios que pida, aplicados al prototipo y a este cambio.
  - Aprobado el 2026-11-11 («Apruebo el mapa»), sin cambios: los supuestos de la propuesta pasan a ser decisiones.

## 1. Quién vive dónde

- [x] 1.2 Pruebas de `src/features/mapa/lugares.test.js` para los cuatro sitios:
  - son cuatro y sus `to` están en `APP_ROUTES`;
  - el punto de cada uno, proyectado con el encuadre, cae dentro del dibujo, en la posición de la tabla de Context;
  - Los bancos de La Salle, «Los Fundadores, El Spray y 7 más»;
  - el Bar Mundus, «El Portero y El Estrella»;
  - el callejón, «El Tumbao, El Ollie y El Dado»;
  - el kebab, «El Curioso, El Dormilón y 2 más»;
  - los de La Colmena no salen y los del 404 van fuera del mapa;
  - un cromo sin `vistoEn` no rompe nada.

  La prueba «ningún cromo se queda sin sitio» se sustituye por la de los que no salen: es un cambio de especificación que pidió el usuario al quedarse con cuatro sitios. Rojo, después `lugares.js` (D2).

## 2. La cabeza común

- [x] 2.1 Pruebas de `src/components/CabezaMuneco.test.jsx`: foco, fondo oscuro, dibujo de noche y `alt=""`. Rojo, después la pieza y `cabeza-muneco.css`. La ficha pasa a usarla. Verificación: `ProductDetail.test.jsx` y `voz-de-la-crew.test.js` en verde sin tocarlas (D3).

## 3. El mapa

- [x] 3.2 El plano horneado (D4):
  - pruebas del simplificador: una recta se queda en sus dos extremos y un anillo cerrado conserva su forma (el fallo que tuvo el prototipo);
  - pruebas de `plano.js`: tiene las cuatro capas, el metro cae dentro del dibujo y ninguna cadena apunta fuera (`http`, `url(`).

  Rojo, después `scripts/plano-lacoma.mjs` y su salida `src/features/mapa/plano.js`, con la consulta de Context.
  - Generado desde el extracto del 2026-11-11 (12:17 UTC): 42 vías anchas, 118 calles, 13 parques y 4 rótulos, unos 3 kB con gzip con la cabecera. De qué extracto sale y cómo se reproduce, en D4.
- [x] 3.3 Pruebas de `MapaDelBarrio.test.jsx` con el plano real:
  - cuatro enlaces cuyo nombre lleva el sitio y la sección que abre;
  - la cabeza de cada vecino;
  - el dibujo con `aria-hidden` y sin `<image>` ni enlaces de fuera;
  - los cuatro puntos numerados;
  - la atribución «© colaboradores de OpenStreetMap» con su enlace;
  - con `tuEstasAqui`, la nota y la chincheta, y sin él, nada.

  Rojo, después el componente, `mapa.css` y el token `--park` en `00-tokens.css` (D4, D5, D9). Verificación: `svgTokens.test.js`, `hover-tactil.test.js` y `npm run lint:css` en verde.

## 4. Las dos entradas

- [x] 4.1 Pruebas de `NotFound.test.jsx`: de día el 404 trae el mapa con «tú estás aquí», y de noche no. Las pruebas existentes siguen igual. Rojo, después `NotFound.jsx` (D7).
- [x] 4.2 Pruebas de `Footer.test.jsx`: abrir el diálogo sin «tú estás aquí», cerrarlo con Escape o con su botón devolviendo el foco, e ir a un sitio cerrándolo sin devolverlo (D6).
- [x] 4.3 Las pruebas del pie que pulsan un sitio pasan a pulsar el callejón, como dice la especificación. Es un cambio de nombre que viene de la especificación, no una prueba relajada: siguen afirmando el destino (`/menudrop`) y el foco.

## 5. Verificación e integración (segunda versión)

- [x] 5.1 `npm run build` y `npm run budget:check`:
  - el mapa sigue fuera del JavaScript inicial;
  - el CSS inicial solo crece por el token `--park`, que se mide;
  - el mayor diferido sigue por debajo de 21 kB;
  - ningún fichero de imagen nuevo.
  - Medido en el `check`, todo con gzip:
    - JavaScript inicial 99,95/100 kB;
    - CSS inicial 13,78/15 kB: +0,02 kB, el token `--park`;
    - mayor diferido 20,98/21 kB (el Estudio, sin cambios);
    - imágenes 8743,22/8750 kB, sin ficheros nuevos;
    - el chunk del mapa pasa de 2,0 a 4,9 kB, con el plano dentro.
- [x] 5.2 Capturas en el navegador sin ventana a 1440, 1000, 901, 768 y 375 px:
  - el 404 de día con el mapa, sin tarjetas pisadas ni fuera del dibujo;
  - el 404 de noche sin mapa;
  - el diálogo del pie de día y de noche, con la atribución a la vista.

  Con teclado: Tab por los cuatro sitios y Escape en el diálogo.
  - Hecho el 2026-11-11 sobre :3006 con Chrome sin ventana.
    - En los cinco anchos y en el diálogo de día y de noche: cuatro sitios, ninguna tarjeta pisada ni fuera del dibujo y sin scroll horizontal. La atribución se ve.
    - El 404 no pide nada fuera de la web. En el diálogo, lo único de fuera son las fotos de producto de la portada que queda detrás.
    - Tab recorre los cuatro sitios en orden y luego el enlace de OpenStreetMap.
    - Escape cierra el diálogo y el foco vuelve a «El mapa de Lacoma».
    - De noche el 404 sigue sin mapa.
  - Repetido con el código final, tras la segunda ronda de revisión:
    - lo mismo en los cinco anchos;
    - el diálogo a 320 px, con la columna en 236 px y sin desbordar;
    - el CLS del 404 con el chunk nuevo: 0,0001 a 1440, 1000, 768 y 375 px, sin ninguna entrada del mapa ni del pie.
- [x] 5.3 `npm run check` en verde y ningún límite subido: 180 ficheros y 2068 pruebas en verde, lint y lint de CSS limpios, build, presupuesto y escaneo de secretos correctos.
- [x] 5.4 Segunda ronda de revisión independiente con Fable 5.2 y contexto limpio, limitada a lo que cambia en la segunda versión (skill `engineering-review`).
  - Sin bloqueantes: 1 hallazgo importante y 9 menores. Comprobados uno a uno contra el código.
  - **Corregidos con su prueba**, primero en rojo:
    - la prueba de los cromos sin sitio fija ahora el conjunto entero (los cinco de La Colmena), y un sexto obliga a decidir;
    - el nombre accesible de cada enlace separa el sitio de la sección («Bar Mundus Rocky IA · …»), y la prueba lo afirma sin el número;
    - el generador:
      - mide Douglas-Peucker al tramo, no a la recta (la horquilla);
      - mete la vía que cruza el dibujo sin vértices dentro (Liang-Barsky);
      - pone el rótulo en el tramo seguido más largo.
  - **Corregidos y comprobados en Chrome sin ventana:**
    - la M del metro pasa a `--card` y se lee sobre la lima de noche;
    - la lista del móvil usa `minmax(min(260px, 100%), 1fr)`: a 320 px la columna mide 236 px y no desborda;
    - `max-width: none` en la lista del móvil;
    - las guías van debajo de los rótulos, y el halo del texto tapa la del Bar Mundus.
  - **Corregido en los documentos:**
    - las «cinco cabezas» de la propuesta (son cuatro);
    - en D4, la caja envolvente de los parques y de qué extracto sale `plano.js`, con su hash.
    - La consulta documentada se ejecutó contra un espejo, con datos del 2026-06-01, y da las mismas capas salvo dos coordenadas.
  - **Medido y anotado:**
    - con los datos de hoy ninguna vía cruzaba el dibujo sin vértices dentro;
    - el plano regenerado solo pierde un punto.
  - **Matizado:** `max-width: 18ch` sí estaba en el prototipo, que enlaza el `mapa.css` real.
  - Después: `npm run check` en verde, con 180 ficheros y 2072 pruebas.

## Workflow follow-up

- Commit, publicación y archivo solo cuando el usuario lo pida.
- Aparte: comprobar si `/product/rockyracing` y `/products/agotado`, que enlaza el álbum de la Crew, existen en la tienda.
- Aparte: la página propia `/mapa`, cuando haya margen en el JavaScript inicial.

## Historial de la primera versión

Hecho y verificado el 2026-11-11 con el dibujo inventado y los seis sitios.

- **Ya no vale:**
  - 1.1, los seis sitios: sustituida por 1.2;
  - 3.1, el dibujo inventado: sustituida por 3.2 y 3.3;
  - las cifras de 5.1 y las capturas de 5.2.
- **Lo que sigue valiendo:**
  - el JavaScript inicial: entre 99,95 y 99,97/100 kB, +0,02 a +0,04 por la cabeza compartida (D3);
  - el CLS del 404: 0,0001 en cuatro anchos (Riesgos);
  - la revisión independiente con Fable: una ronda sin bloqueantes, con 3 hallazgos importantes y 7 menores, corregidos con su prueba o anotados (D6, D8 y Riesgos);
  - `npm run check` en verde, con 2046 pruebas.
