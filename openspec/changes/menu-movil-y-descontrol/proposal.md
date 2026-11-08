# Propuesta: menú móvil que se cierra y descontrol que lleva a la portada

## Why

El usuario ha comprobado en producción (2026-11-08, móvil, `/estudio`) que la hoja del menú
«se queda pillada» y no se puede cerrar. La auditoría ya lo tenía documentado:

- **H-010**: el bloqueo de scroll pone `overflow: hidden` en el `body`, pero quien desplaza
  es el `<html>` (que tiene `overflow-x: clip` y no recibe el `overflow` del `body`). La
  página sigue moviéndose bajo la hoja, el `body` pasa a ser contenedor de scroll y la
  barra sticky, con el botón «Cerrar el menú», se va de la pantalla si la hoja se abre
  después de bajar. Pasa igual con el lightbox y con la intro. Además, cada bloqueo restaura
  lo que vio al entrar: si se solapan dos (intro y menú), la página puede quedarse sin
  scroll.
- **H-014**: la hoja es un diálogo modal cuyo único control de cierre está fuera de él (en
  la barra), así que con teclado o lector de pantalla solo se cierra con Escape o eligiendo
  un destino.

El usuario pide además que, al activar el modo descontrol, se vaya a la portada después de
enseñar el rótulo «Descontrol activado».

Es un subconjunto del cambio candidato C12 (`navegacion-y-accesibilidad-global`) del plan
de fases aprobado, adelantado por ser un fallo visible en producción.

## What Changes

- El bloqueo de scroll actúa sobre el elemento que desplaza la página y no convierte el
  `body` en contenedor de scroll; varios bloqueos a la vez se acumulan y la página solo se
  libera cuando se suelta el último. La intro usa el mismo bloqueo que el menú y el
  lightbox.
- La hoja del menú tiene un control «Cerrar» dentro del diálogo, alcanzable con teclado y
  lector de pantalla.
- Al activar el descontrol con la bombilla, cuando termina el rótulo se navega a la
  portada; si ya se está en ella, no se navega. Si se activa desde la hoja del menú, la
  hoja se cierra.

## Capabilities

### New Capabilities

- `navegacion-movil`: bloqueo de scroll de las capas que tapan la página y cierre de la
  hoja del menú.
- `modo-descontrol`: qué pasa al activar el modo descontrol.

### Modified Capabilities

Ninguna (no hay especificaciones previas en `openspec/specs/`).

## Fuera de alcance

- El resto de C12: «Saltar al contenido» (H-013), foco y anuncio al cambiar de ruta (H-015),
  foco que cae al `body` (H-016), intro saltable (H-040), `ScrollToTop` (H-041) y los demás
  menores. Siguen en C12.
- El orden de capas del bote de spray sobre la hoja del menú.
- El desbordamiento de los pads del estudio en móvil: arreglo de nivel 1 en su propio
  commit, sin cambio OpenSpec.

## Supuestos

- «Ir al home» es navegar a `/` cuando termina el rótulo (1,4 s). Con movimiento reducido
  no hay rótulo, así que se navega en cuanto se activa.
- Apagar el descontrol no navega a ningún sitio.
- Activar el descontrol desde la hoja del menú cierra la hoja: si se está ya en la
  portada, la navegación no la cerraría y taparía la noche recién encendida.
- El control «Cerrar» de la hoja solo se ve cuando recibe el foco: en táctil la «X» de la
  barra vuelve a estar siempre visible con el arreglo de H-010, y un segundo botón visible
  chocaría con el bote de spray, que de noche ocupa la esquina inferior derecha.

## Impact

- Código: `src/hooks/useLockBodyScroll.js`, `src/components/SplashIntro.jsx`,
  `src/components/NavBar.jsx`, `src/styles/components/navbar.css`,
  `src/features/night/Descontrol.jsx` y `src/App.jsx`, con sus pruebas.
- Pruebas existentes: tres pruebas (hook, `NavBar` y `Lightbox`) comprobaban
  `body.style.overflow === 'hidden'`, que es justo el mecanismo defectuoso de H-010. Se
  sustituyen por la comprobación del bloqueo sobre `<html>` (bloquea y devuelve el valor
  previo) y de que el `body` no se toca; no se relaja ninguna.
- Sin cambios de API, servidor ni datos persistidos.
