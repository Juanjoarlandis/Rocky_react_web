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
