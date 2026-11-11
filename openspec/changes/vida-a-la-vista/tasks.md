# Tareas: la vida a la vista

Nivel 2. TDD en cada tarea: prueba en rojo por la razón esperada, implementación mínima,
refactor en verde. Antes de empezar, línea base: `npm run test:run` y `npm run budget:check`.

## 1. La escena de la portada espera a la intro

- [x] 1.1 Prueba de contrato en `src/styles/vida-a-la-vista.test.js`: `home.css` pausa (`animation-play-state: paused`) `.spray-line path`, `.spray-chorro i` y `.spray-cruiser` bajo `:has(.splash-intro)`, y el bloque de movimiento reducido sigue igual. Rojo, después la regla (D1). Verificación: la prueba pasa y, en el panel, la primera visita con `rocky-splash-seen` borrado muestra la línea pintándose al irse la intro.

## 2. El hover que mueve, solo con ratón

- [x] 2.1 Prueba de invariante en `src/styles/hover-tactil.test.js`. Recorre todas las hojas de `src/styles/` con un analizador de llaves y exige que cada regla con `:hover` que fije `transform`, `translate`, `rotate` o `scale` esté dentro de un `@media` con `hover: hover`. Rojo con la lista de reglas que hoy incumplen.
- [x] 2.2 Envolver las reglas de `home.css`, `product-media.css`, `03-utilities.css`, `04-buttons.css` y `navbar.css`, partiendo los selectores compartidos con `:focus-visible`, `:focus-within` o `:active` (D2). Verificación: la parte de 2.1 de estas hojas en verde, y en el panel la tarjeta se levanta con ratón y no queda levantada en el preajuste móvil.
- [x] 2.3 Lo mismo en las hojas diferidas (pie, Crew, cartel, muro, carrito, Estudio, radio, chat, lightbox, spray, ranking y demás). Verificación: 2.1 en verde entera y `npm run lint:css` sin errores.

## 3. El punto de mira barre el catálogo en táctil

- [x] 3.1 Prueba de contrato. En `product-media.css` (o `home.css`), la tarjeta declara `view-timeline` con nombre y la retícula la usa. Todo va dentro de `@media (hover: none) and (prefers-reduced-motion: no-preference)` y de `@supports (animation-timeline: view())`, y excluye `.is-sold-out`. La regla del disparo `:has(.btn--added)` sigue con el atajo `animation` y más especificidad. Rojo, después la regla (D3).
- [x] 3.2 Comprobación en el panel con el preajuste móvil: la retícula se cierra en la tarjeta que cruza el centro y se abre al irse; un agotado no la muestra; al añadir se ve el disparo. Captura para el informe.
  - Hecho el 2026-11-11 con Chrome sin ventana (el panel estaba oculto y no avanza las animaciones), a 375×812 táctil: opacidad 1 en la tarjeta centrada y 0 al alejarse; un toque no la deja levantada. El caso del agotado no se pudo ver: la tienda de pruebas no tiene ninguno. Tampoco se vio el disparo al añadir en táctil. Los dos los cubre la prueba de 3.1.

## 4. La Estampida desde el pie

- [x] 4.1 Pruebas de `Footer.test.jsx`: hay un botón «Llamar a la crew» con la ilustración dentro; al pulsarlo (clic y teclado) llama a `onLlamada`; sin `onLlamada` no falla. Rojo, después el botón y su CSS en `footer.css` (D4).
- [x] 4.2 Prueba en `App.test.jsx` (o `App.pieces.test.jsx`): pulsar «Llamar a la crew» monta la Estampida igual que teclear «035». Rojo, después la prop en `App`. Verificación: `npm run build` y `npm run budget:check` dentro de límites (D8).
- [x] 4.3 Comprobación en el panel, de día y de noche, en escritorio y móvil: el dibujo no se mueve de su sitio, el foco se ve con Tab y al tocarlo sale la crew.

## 5. La crew celebra la caída de un drop

- [x] 5.1 Pruebas de `useDrops.test.jsx` con reloj falso:
  - al caer un drop anunciado y confirmarlo el servidor, `onFall` se llama una vez;
  - los repasos a los 5, 15 y 35 s no la vuelven a llamar;
  - el cierre de un drop a la venta no la llama;
  - si el servidor tarda y confirma en un reintento, se llama una vez.

  Rojo, después `onFall` en `useDrops` (D5).
- [x] 5.2 Conectar `onFall` en `App` con la subida de `estampidas`, con prueba de que una caída monta la Estampida. Verificación: `npm run build` y `npm run budget:check`. Si el JavaScript inicial no cabe, se revierte 5.2, se anota en el informe y no se sube el límite (D8).

## 6. Tachones con intención

- [x] 6.1 Prueba de contrato del CSS: `.tachon` sin `line-through`, el trazo en `var(--accent)` con máscara de token (primero fue `currentColor`; en la captura no se distinguía de la palabra), animado solo con `prefers-reduced-motion: no-preference`. Rojo, después el token en `00-tokens.css` y la regla en `03-utilities.css` (D6).
- [x] 6.2 Pruebas de `Cart.test.jsx`, `NotFound.test.jsx` y `Muro.test.jsx`. La frase lleva la palabra tachada con `aria-hidden` y su nombre accesible es la frase buena: el título del carrito vacío se lee «Tu carrito está vacío». El 404 de noche no lleva tachón. Rojo, después el marcado en las tres piezas. Verificación: las pruebas existentes de esas piezas siguen en verde sin tocarlas.

## 7. Títulos con la segunda tinta corrida

- [x] 7.1 Prueba de contrato. `.page-title` lleva `text-shadow` con `--blue-rgb` y la animación `tinta-registro` solo con `prefers-reduced-motion: no-preference`. La regla de neón sigue fijando su propio `text-shadow`. La pausa de la tarea 1.1 incluye el rótulo de la portada. Rojo, después las reglas (D7).
- [x] 7.2 Comprobación en el panel: antes y después del rótulo de la portada, de la Crew y del carrito, de día y de noche, y el logotipo de la barra igual. Capturas para el informe.

## 8. Verificación e integración

- [x] 8.1 `npm run check` en verde (pruebas, lint, lint:css, build, presupuesto y secretos). Ningún límite subido. Si alguno pide bajarse, se baja en el mismo cambio.
- [x] 8.2 Recorrido en el panel con el servidor local en :3006: portada con y sin intro, catálogo con ratón y en móvil, pie de día y de noche, carrito vacío, 404 y muro; con movimiento reducido emulado si el panel lo permite. La caída del drop no se puede ver en vivo: queda cubierta solo por las pruebas de 5.1 y 5.2.
  - Hecho el 2026-11-11 con Chrome sin ventana sobre :3006: intro (escena en pausa a 0 ms con la intro, a 300 ms 300 ms después), ratón, táctil, pie de día y de noche (foco, Intro y toque lanzan la Estampida), carrito vacío de día y de noche, 404 y movimiento reducido. El muro vacío no se pudo ver: la tienda de pruebas tiene drops; lo cubre `Muro.test.jsx`. La caída del drop solo la cubren las pruebas.
- [x] 8.3 Revisión independiente (skill `engineering-review`) contra estos specs y el diff; corregir los bloqueantes, con dos rondas como máximo.

  - Hecha el 2026-11-11 en una ronda, con dos revisores de contexto limpio: Opus 5.5 y Fable 5.2. Ningún bloqueante. Corregidos con su prueba:
    - la mira del foco frente al barrido y frente al disparo;
    - `onFall` con un drop aplazado o retirado;
    - la pausa bajo la intro del rótulo y del tachón;
    - el `.doodle` del pie;
    - el textual de D3 y de 6.1.

    Prueba nueva de «llamar otra vez», comprobada quitando la protección. El límite de la prueba de hover está anotado en ella.

## Workflow follow-up

- Commit, publicación y archivo solo cuando el usuario lo pida.
