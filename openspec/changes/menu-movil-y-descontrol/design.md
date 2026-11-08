# Diseño: menú móvil que se cierra y descontrol que lleva a la portada

## Context

`useLockBodyScroll(locked)` pone `overflow: hidden` en `document.body` y, al soltar,
restaura el valor que vio al entrar. `SplashIntro` hace lo mismo por su cuenta. Con
`html { overflow-x: clip }` (`src/styles/02-base.css`), el `overflow` del `body` no se
propaga al viewport: no bloquea nada y convierte el `body` en contenedor de scroll, al que
se pega la barra sticky.

La hoja del menú (`NavBar.jsx`) es `role="dialog" aria-modal="true"` y va fuera del
`<header>` porque el `backdrop-filter` de la barra encerraría su `position: fixed`.

`Descontrol.jsx` detecta el encendido (paso de día a noche) y muestra el rótulo 1,4 s; no
conoce el router.

## Goals / Non-Goals

**Goals:** que la página no se mueva bajo el menú, el lightbox y la intro; que la barra
siga arriba y la hoja se pueda cerrar siempre; que activar el descontrol acabe en la
portada.

**Non-Goals:** el resto de C12; rediseñar la hoja o la barra.

## Decisions

### D1. Bloquear `<html>` con un contador de módulo

El hook pone `overflow: hidden` y `scrollbar-gutter: stable` en `document.documentElement`
mientras haya al menos un bloqueo activo, guarda los valores previos solo al entrar el
primero y los restaura al salir el último. No toca el `body`.

- `scrollbar-gutter: stable` evita que el contenido salte el ancho de la barra de
  desplazamiento en escritorio (lightbox, intro); en móvil, con barras superpuestas, no
  tiene efecto.
- Alternativa descartada: `position: fixed` en el `body` con `top: -scrollY`. Bloquea
  también en iOS antiguos, pero mueve la barra sticky y obliga a restaurar el scroll a
  mano; es justo el tipo de efecto que rompió H-010.
- Alternativa descartada: bloquear `html` y `body` a la vez. El `body` con `hidden` sigue
  siendo contenedor de scroll y la barra se le pega.

### D2. Un control «Cerrar» dentro de la hoja, visible al enfocarlo

Último control del diálogo, tras la bombilla. Se oculta como `.sr-only` y se muestra al
recibir el foco. Nombre accesible «Cerrar», distinto de «Cerrar el menú» del botón de la
barra (H-055). Cierra y devuelve el foco al botón de la barra, igual que Escape.

- Alternativa descartada: quitar `aria-modal` e incluir el botón de la barra en la trampa
  de foco. Deja el resto de la página al alcance del lector de pantalla con la hoja
  tapándola.
- Alternativa descartada: un botón siempre visible. Duplica la «X» que queda justo encima
  y, de noche, choca con el bote de spray.

### D3. `Descontrol` avisa; `App` navega

`Descontrol` recibe `onActivated` y lo llama cuando termina el rótulo, o al encender si hay
movimiento reducido. Si se apaga a mitad de rótulo, no lo llama. Guarda la última versión
del callback en una referencia, para no reiniciar el temporizador en cada render. `App`
pasa un callback que navega a `ROUTES.home` si la ruta actual no lo es.

- Así `Descontrol` sigue sin depender del router (sus pruebas lo montan sin él), y la regla
  «a dónde se va» queda en la composición de rutas.

### D4. La hoja se cierra al activar el descontrol desde ella

En `NavBar`, si el clic en la bombilla de la hoja enciende el neón, se cierra la hoja con
el mismo `closeMenu` de los destinos.

## Contratos

Sin cambios de API ni de datos. `Descontrol` gana una prop opcional (`onActivated`); sin
ella, se comporta como hasta ahora.

## Risks / Trade-offs

- Safari de iOS anterior a 16 no respeta `overflow: hidden` en `<html>` para el gesto
  táctil. Riesgo aceptado: la cuota de esas versiones es residual, y aun así la barra ya no
  se va de la pantalla, porque el `body` no se convierte en contenedor.
- `scrollbar-gutter` no existe en Safari anterior a 18.2. Allí el contenido puede moverse
  unos píxeles al abrir el lightbox en escritorio, que es como era antes.

## Migration Plan

Sin migración. Rollback: revertir el commit.

## Open Questions

Ninguna bloqueante (ver «Supuestos» en la propuesta).

## Revisión independiente (ronda única, 2026-11-08)

Revisor con contexto limpio (subagente). Sin bloqueantes ni importantes; 9 menores.

Corregidos:

- **Hueco de la barra de desplazamiento**: `scrollbar-gutter: stable` reservaba hueco
  también sin barra visible (páginas cortas en escritorio). Ahora solo se reserva si la
  había, con prueba de los dos casos.
- **Origen del clic**: el origen del clic en la bombilla se deducía del nombre de la
  clase CSS. Ahora es un parámetro explícito (`enLaHoja`).
- **Documentación**:
  - la propuesta y la tarea 1.3 recogen las tres pruebas ajustadas;
  - la verificación en Chrome se amplió al lightbox (táctil a 375 px y rueda en
    escritorio) y a la intro (rueda).
- **Etiquetas de los pads a 320 px**:
  - medido en la app real, «Redoble» pisaba el borde 0,5 px y «Reversa», «Subidón» e
    «Impacto» quedaban a menos de 1 px;
  - el revisor daba de 3 a 6 px, medidos en una página sintética;
  - la etiqueta escala con `min(var(--text-2xs), 3.4vw)` y ahora todas quedan dentro.

Deuda registrada (no se corrige en este cambio):

- Si se navega a otra ruta durante el rótulo (1,4 s), al terminar se va igualmente a la
  portada. Es coherente con la especificación («cuando termine»).
- Encender el descontrol durante la intro, con la bombilla alcanzada por Tab (H-040),
  navega sin rótulo visible. Se resuelve con H-040 en C12.
- La prueba de que «Cerrar» se ve al enfocarlo es de texto sobre el CSS (límite de
  jsdom). La evidencia real es la verificación en Chrome: 114×46 px con foco.
- Las pruebas de `App` del descontrol esperan unos 4,5 s en tiempo real.
- `useLockBodyScroll` ya no toca el `body`; renombrarlo queda para C12.
