# Progress

## Task 01 — component and tests

- Status: completed locally.
- Files: `src/components/CuriousPeeker.jsx`,
  `src/components/CuriousPeeker.test.jsx`.
- Red evidence: the targeted suite failed because the component did not exist.
- Green evidence: the focused component suite passed 1 file and 8 tests after
  adding explicit mobile cadence and Estudio rotation coverage.
- Result: deterministic desktop/mobile timing, automatic hide/rotation, timer
  cleanup, splash and route exclusions, decorative image semantics and Estudio
  player fallback are implemented without dependencies.

## Task 02 — integration and visual QA

- Status: completed locally.
- Files: `src/App.jsx`, `src/App.test.jsx`,
  `src/styles/CuriousPeeker.css`.
- Integration evidence: the peeker is absent during splash and mounted after
  it; the combined focused run passed 2 files and 11 tests.
- Desktop QA: Navbar, right edge and BARRO player positions were observed in a
  real browser. The settled side reveal leaves 92 px visible in a 1440 px
  viewport, and `scrollWidth` remains below `innerWidth`. Behind BARRO, the face
  sits above the player while its body remains correctly occluded.
- Mobile QA: at the real mobile media query, the peeker is 107 px wide, centered
  below the Navbar, does not cover navigation links and introduces no
  horizontal overflow.
- Result: all three layers are intentional, decorative and responsive; Estudio
  skips the player position and reduced-motion CSS removes the animation.

## Task 03 — deploy and verify

- Status: completed.
- Release: `/opt/rocky035/releases/20260808T163208Z-dc85923-wt-curious-peeker`.
- Image: `rocky035:20260808T163208Z-dc85923-wt-curious-peeker`, digest
  `sha256:cff5e0a4fa4ae3ca44df1dc2a645f832521dc3a54c610761515522f4065af575`.
- Build evidence: the Raspberry image build repeated all 204 tests and the
  production bundle successfully before switching traffic.
- Runtime evidence: the container is running and healthy after a controlled
  restart; private and public apex/www health endpoints return `200`, and
  `cloudflared` remains active.
- Public evidence: Cloudflare serves `index-ky3vS0FT.js` as an immutable cache
  HIT; it contains the `curious-peeker` marker and optimized El Curioso asset.
  A real authenticated `/mi-crew` load showed the Navbar appearance using that
  exact bundle with no horizontal overflow.
- Rollback: release and image
  `20260808T160408Z-dc85923-wt-navbar-avatar` remain present and untouched.

## Production visual hotfix

- Symptom: the first appearance sat mostly below the Navbar, leaving the head
  and hands floating over the MiCrew heading without a visible supporting edge.
- Root cause: the Navbar only occluded a few pixels of the illustration; its
  lower edge could not act as the ledge the source artwork was drawn to hold.
- Fix: replace the Navbar hiding place with a rotated top-right viewport reveal,
  so the viewport clips the body and provides a real edge.
- Regression evidence: the focused suite failed against the old `navbar`
  position and passed all 8 tests after changing it to `top-right`; the complete
  suite still passes 204 tests.
- Release: `/opt/rocky035/releases/20260808T164415Z-dc85923-wt-corner-peek`,
  image digest
  `sha256:c9e1f5cb0c9caf76fb3f1dca6d62967b9bb4ed5d8921a7ad2051ff58d6c7e2cc`.
- Public QA: the production bundle `index-LvmiZ9BL.js` rendered the new
  `curious-peeker--top-right` position clipped by the right edge with no
  horizontal overflow.
- Final verification note: one unconstrained local Vitest rerun exhausted its
  worker pool; after stopping the temporary dev server, the focused 8-test
  regression suite and the complete 204-test suite both passed with one worker.
  The Raspberry image build had independently passed the same 204 tests.

## Task 04 — rediseño 2026-08-09: escondites reales

- Status: completed locally.
- Files: `src/components/CuriousPeeker.jsx`,
  `src/components/CuriousPeeker.test.jsx`, `src/styles/CuriousPeeker.css`,
  `src/App.test.jsx`.
- Symptom: con cuatro posiciones fijas la aparición resultaba escueta, salía
  girada 90° en los laterales y en el carrito y Rocky IA no salía nunca.
- Root cause: las posiciones estaban escritas a mano en CSS y las laterales
  giraban un dibujo pensado para agarrarse a un filo horizontal, así que la
  cara quedaba tumbada y el recorte no coincidía con ningún borde real.
- Fix: buscar escondites en el DOM antes de cada aparición (bloques opacos y
  con canto suficiente, más el filo inferior de la pantalla), colocar la
  ventana con `overflow: hidden` sobre el borde elegido y palpar el canto
  pintado con `elementFromPoint`, porque las tarjetas van giradas y con
  esquinas irregulares y su rectángulo cae por fuera del trazo. Sin giros,
  sin sombra propia, uno solo a la vez y presente en todas las rutas.
- Ajustes pedidos por el usuario: una única cara (la de vigilar), tamaño más
  pequeño (`ART.size` 138 → 104) y alturas de asomo variables —sólo el gorro,
  gorro y ojos, o entero— con un estirón a mitad de aparición.
- Evidence: 214 tests en verde, `npm run build` correcto y captura en
  navegador a 375 px con las manos apoyadas en el canto de la tarjeta y una
  sola aparición simultánea (alturas observadas 46% → 2% → 100%).

## Task 05 — El Cotilla de esquina (2026-08-09)

- Status: completed locally.
- Files: `src/components/CuriousPeeker.jsx`,
  `src/components/CuriousPeeker.test.jsx`, `src/styles/CuriousPeeker.css`,
  `src/images/optimized/characters/cotilla-esquina-460.webp`.
- Asset: `src/images/characters/cotilla-esquina.png` (620x820 RGBA, ImageGen),
  con `docs/cotilla-esquina-preview.html` como referencia de geometría.
- Medido antes de integrar: el PNG es transparente de verdad (71% del lienzo),
  la tinta llega a la última fila y hay una línea de canto dibujada de ~11 px
  centrada en x = 360; en la franja visible sólo hay cuerpo hasta y ≈ 500,
  salvo la punta de la zapatilla, que sí llega a la base.
- Integración: se añade la pose `esquina` al componente que ya existía en vez de
  envolver las tarjetas en un contenedor de anclaje. La ventana se coloca en
  coordenadas de viewport sobre el canto **pintado** del bloque, no sobre su
  rectángulo: en las esquinas de ROCKY el radio inferior levanta la base hasta
  15 px y con el rectángulo el muñeco quedaba colgado. El resultado visual es el
  mismo que taparlo con `z-index`, porque lo que cae dentro del bloque se
  recorta y nunca se pinta.
- Espejado: se voltea la capa que mide lo que la ventana, no la imagen, así que
  la línea de agarre pasa del canto derecho al izquierdo sin compensar los
  260 px ocultos del lienzo.
- Peso: el PNG original son 585 kB; se sirve un derivado de 348x460 en WebP de
  47 kB, en línea con el resto de personajes (`asomado-borde-600` son 39 kB).
- Dónde sale: en Estudio (`studio-player`, `mesa`, por los dos lados) y en Crew
  (`crew-marcador`). En la rejilla de producto no cabe —25 px entre tarjetas— ni
  en móvil, y ahí se queda la pose de arriba.
- Evidence: 219 tests en verde, `npm run build` correcto, capturas de las dos
  esquinas y comprobación de que no hay desbordamiento horizontal a 375 px.

## Task 06 — las sombras también tapan (2026-08-09)

- Status: completed locally.
- Files: `src/components/CuriousPeeker.jsx`, `src/components/CuriousPeeker.test.jsx`.
- Symptom: en la esquina derecha el muñeco se dibujaba por encima de la sombra
  del bloque en vez de salir de detrás de ella.
- Root cause: la colocación se apoyaba en el trazo que devuelve
  `elementFromPoint`, y el hit testing no ve el `box-shadow`. Las sombras de
  ROCKY son bloques de tinta duros (`--shadow-ink`: 5px 5px 0) desplazados abajo
  y a la derecha, así que en el lado derecho sobresalen del borde entre 2 y 9 px.
- Fix: `shadowExtents()` lee el `box-shadow` calculado —descartando las `inset` y
  quedándose con la capa que más sobresale por cada lado— y el canto por el que
  sale pasa a ser el de fuera de la sombra. El bulto que no puede pisar de otros
  bloques y de las zonas reservadas es ahora el rectángulo inflado con su sombra.
- No aplica a la base ni al canto de arriba: la sombra cae hacia abajo y a la
  derecha, y en esos dos sitios el muñeco no la tiene ni debajo ni encima.
- Evidence: 221 tests en verde. Medido en `.studio-player` (sombra 5px 5px):
  canto pintado 794, fin de sombra 799, canto de la ventana 797 — dentro de los
  2 px de mordida del agarre y por fuera de la sombra.

## Task 07 — los muñecos estaban huecos (2026-08-11)

- Status: completed locally.
- Files: `src/images/characters/cotilla-esquina.png`,
  `src/images/characters/larguirucho-esquina.png` y sus derivados en
  `src/images/optimized/characters/`.
- Symptom: se veía el fondo de la web a través del cuerpo de los muñecos.
- Root cause: los PNG salidos de ImageGen sólo traen la tinta y los rojos. En
  `cotilla-esquina` no había NI UN píxel blanco opaco: cara, pantalón, suelas y
  corbata estaban a alfa 0 (11,5% del lienzo hueco). En `larguirucho-esquina`,
  un 2,9%. `asomado-borde`, el original, tenía 0 huecos: por eso el fallo sólo
  aparecía con los personajes nuevos, y sobre papel casi no se notaba.
- Fix: relleno por inundación desde el borde para separar el lienzo de fuera del
  interior; todo lo vacío que no se alcanza desde fuera se pinta de blanco
  opaco. El contorno exterior no se toca para no comerse su suavizado; el
  degradado de dentro del trazo sí se compone sobre blanco. En el Cotilla se
  sella el canto de abajo, que es por donde el dibujo se sale a propósito.
- Evidence: los tres sobre `--ink` puro sin transparencias. De paso pesan menos
  (cotilla 47 -> 27 kB, larguirucho 47 -> 43,5 kB): el relleno sólido comprime
  mejor que el degradado de alfa. 237 tests en verde y build correcto.

## Task 08 — variedad y escala de los escondites (2026-08-11)

- Status: completed locally.
- Files: `src/components/CuriousPeeker.jsx`, `src/components/CuriousPeeker.test.jsx`.
- Symptom 1: en la tienda, de scroll 800 en adelante el reparto era 100%
  "entra por el filo de abajo de la pantalla", en todas las posiciones.
- Root cause 1: dentro de la rejilla, el canto de arriba de cada tarjeta lo tapa
  la fila anterior (solape 0,75) y las esquinas no caben en los 12 px de hueco
  entre columnas. No quedaba ningún canto libre.
- Fix 1: se aceptan las franjas interiores como escondite —`.product-body` y
  equivalentes—, que no pintan fondo pero tienen el canto de arriba dibujado
  (el borde de abajo del hermano que llevan encima) y detrás un bloque opaco que
  las contiene. Van marcadas `soloArriba`: sus laterales no están pintados, así
  que ahí no se hace la esquina. Y pisar el bloque que contiene a tu escondite
  deja de contar como invasión, porque estás dentro de él.
- Symptom 2: se escondía detrás de cosas más pequeñas que él: el botón "VER
  DROP 4" (240x64), la píldora de la radio (175x67) y cromos de 145 px.
- Root cause 2: los mínimos eran fijos (170x44) y no tenían nada que ver con el
  tamaño al que se dibuja el muñeco.
- Fix 2: los mínimos se calculan del propio dibujo — el bloque tiene que ser más
  alto que él y vez y media más ancho — y para la esquina, además, tres veces
  más ancho que lo que él saca por el canto. Escala solo con el viewport.
- Evidence: en la tienda, de 100% pantalla a ~90% tarjetas en todas las
  posiciones de scroll, también en móvil. Estudio (52-69% esquinas) y Crew
  (hasta 97%) sin cambios. Ningún control tapado: los botones de las tarjetas
  quedan 100 px por debajo de la ventana. 242 tests en verde y build correcto.

## Task 09 — El Lata anda de verdad (2026-08-11)

- Status: completed locally.
- Files: `src/components/Footer.jsx`, `src/styles/Footer.css`,
  `src/images/characters/lata-spray-walk-cycle.png` (rejilla 2x2 de ImageGen),
  `src/images/characters/lata-spray-walk-strip.png` (tira alineada y rellenada),
  `src/images/optimized/characters/lata-spray-walk-592.webp` (la que se sirve).
- Antes: un PNG estático con balanceo y bote fingidos. No movía las piernas.
- Ahora: ciclo de marcha de cuatro fotogramas con `steps(4)` sobre una tira.
- Del material recibido: la línea de pisada venía clavada a y=1150 en las cuatro
  celdas, perfecto. Dos arreglos antes de montar:
  1. **Baile horizontal.** Los torsos no estaban alineados. Se midió por
     correlación del perfil de tinta en la banda del peto (y 560-720) y se
     corrigió cada fotograma: F2 -13 px, F3 -6 px, F4 -12 px.
  2. **Huecos otra vez.** ~3.200 px por celda, esta vez sólo el interior del
     puño levantado, no el cuerpo. Rellenados con el mismo relleno por
     inundación de la Task 07.
- La cadencia no va a ojo: se midió la zancada entre centros de pisada (465
  unidades de un lienzo de 1110 de alto). Cada ciclo son dos pasos, o sea 0,84
  veces su altura de avance. A la velocidad a la que patrulla eso da 1,3 s por
  ciclo. Desfase medido: 3,7% en escritorio y 1% en móvil — no patina.
- Como la velocidad depende del ancho de la cinta, la cadencia lleva tres
  tramos (1,3 / 1,55 / 1,75 s) y por encima de 1600 px se alarga la patrulla a
  60 s, que si no le salía un paso de atleta.
- La tira servida mide 592x224 (celda 148x224, el doble exacto del tamaño en
  pantalla para retina) y pesa 39,7 kB, en línea con el resto de personajes.
- Se quitó el balanceo fingido: el bote y el vaivén ya vienen dentro de los
  fotogramas. Con movimiento reducido se queda en el fotograma de piernas
  juntas, que es el que parece de pie.
- Evidence: 243 tests en verde, build correcto, y comprobado a 1280 y 375 px
  que la mirilla enseña un fotograma limpio, sin asomo del vecino.

## Task 10 — repaso de las tres animaciones (2026-08-11)

- Status: completed locally.
- Files: `src/styles/Footer.css`, `src/styles/ProductPage.css`,
  `src/components/ProductPage.jsx`, `src/components/ProductPage.test.jsx`,
  `src/images/optimized/characters/grafitero-sin-chorro-420.webp` (nuevo).

**El Lata andaba a cámara lenta.** La cadencia la fija la zancada, así que a
0,62 alturas de cuerpo por segundo salían tres fotogramas por segundo y parecía
un pase de diapositivas. Se acelera la patrulla (44s -> 28s, y sus tramos) hasta
0,97 alturas/s —lo que anda una persona— y el ciclo cae en 0,85 s: 4,7
fotogramas por segundo, con 1% de desfase.

**El grafitero caminaba en contra de su propio dibujo.** El PNG lo tiene
rociando hacia abajo y a su izquierda, y estaba puesto a caminar hacia la
derecha, así que la pintura salía por detrás y en dirección contraria. Ahora no
se mueve: la línea se revela desde su bote hacia la izquierda, que es a donde
apunta. La curva termina en x=91 en vez de 98 para que su punta caiga en la
boquilla: medido, 1 px de diferencia.

**El chorro no se movía** porque los puntos venían pintados en el PNG. Se sacó
una variante sin ellos (`grafitero-sin-chorro-420.webp`, 21 kB) y el chorro pasa
a ser tres gotas escalonadas que salen de la boquilla con el mismo recorrido que
traían los puntos del dibujo. La boquilla y las gotas cuelgan de
`--spray-guy-alto`, así que no se despegan al cambiar de tamaño.

**La línea salía a rayas.** El montaje anterior usaba `pathLength="100"` con
guiones cortos, pero el trazo lleva `non-scaling-stroke` y entonces el guion se
mide en píxeles de pantalla: el patrón se repetía once veces. Ahora el guion y
el hueco valen `100cqw`, más largos que la pista, y sale continuo.

**La Cruiser botaba seis veces sobre una sola onda.** Las seis ondas están
repartidas por todo el ancho de la cinta, pero de su entrada sólo se ve algo más
de una. Bota una vez, el recorrido pasa a lineal (con `ease-out` los botes no
caían donde las ondas) y entra después de que la línea esté pintada.

- Los tests que dejó el montaje anterior fijaban el CSS carácter a carácter con
  expresiones regulares; se reescribieron sobre lo que importa: qué dibujo usa,
  que el guion sea más largo que la pista, que la escena no se repita, que la
  Cruiser tenga un único sitio de reposo y que con movimiento reducido quede
  quieta y con la línea entera.
- Evidence: 247 tests en verde, build y `security:check` correctos.

## Task 11 — El Lata pasa a ocho fotogramas (2026-08-12)

- Status: completed locally.
- Files: `src/components/Footer.jsx`, `src/styles/Footer.css`,
  `src/images/characters/lata-spray-walk-8-verde.png` (rejilla 4x2 de ImageGen),
  `src/images/optimized/characters/lata-spray-walk8-1312.webp` (la que se sirve).
  Se borran los derivados del ciclo de cuatro, ya sin uso.
- **El fondo verde resolvió los huecos de raíz.** Los tres personajes anteriores
  llegaron con el cuerpo hueco pidiendo fondo transparente: el modelo trataba lo
  blanco como ausencia de tinta. Sobre verde croma tiene que pintarlo para
  distinguirlo del fondo, y este pliego llegó con **cero huecos interiores**.
- Croma con quita-derrame y desmultiplicado, no un "borra el verde" a lo bruto:
  el alfa sale de cuánto verde queda en cada píxel, se le resta el tinte y se
  desmultiplica. Resultado medido: **0 píxeles con resto verdoso** de 664.984
  visibles, y 0 huecos interiores.
- Del material recibido: la línea de suelo venía clavada en 705 en las ocho
  celdas, y el sube y baja en su sitio (2 y 6 abajo, 4 y 8 arriba). La cadera
  bailaba 25 px; se alineó por correlación del perfil del torso, ajustes
  [0, -12, -11, -5, 32, -14, -8, 40].
- Zancada nueva: 245,5 unidades sobre una figura de 593, o sea 0,414 veces su
  altura — la misma proporción que el pliego de cuatro (0,422), así que la
  cadencia se sostiene: 0,83 s por ciclo con 2% de desfase medido.
- **De 4,7 a 9,6 fotogramas por segundo**, que era el objetivo.
- La tira servida mide 1312x225 (celda 164x225, el doble exacto del tamaño en
  pantalla) y pesa 74,9 kB frente a los 39,7 kB de cuatro fotogramas.
- Evidence: 247 tests en verde, build correcto, saltos de fotograma exactos de
  una celda y comprobación visual de dos fotogramas sin asomo del vecino.
