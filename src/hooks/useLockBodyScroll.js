import { useEffect } from 'react';

/* Bloquea el scroll de la página mientras `locked` sea true (intro, hoja del
   menú, lightbox).

   Se bloquea <html>, que es quien desplaza la página: con su
   `overflow-x: clip`, el overflow del body no llega al viewport, así que
   bloquear el body no paraba nada y lo volvía contenedor de scroll, con la
   barra sticky pegada a él y fuera de pantalla (H-010). El body no se toca.

   Las capas pueden solaparse (el menú abierto durante la intro): se cuentan,
   los valores previos se guardan al entrar la primera y se devuelven al
   salir la última. Si había barra de desplazamiento clásica (escritorio),
   `scrollbar-gutter` guarda su hueco para que el contenido no salte; sin
   ella (móvil, páginas cortas) no se reserva nada. */
let activeLocks = 0;
let saved = null;

function lock() {
  activeLocks += 1;
  if (activeLocks > 1) return;
  const html = document.documentElement;
  const { style } = html;
  const hadScrollbar = window.innerWidth > html.clientWidth;
  saved = {
    overflow: style.overflow,
    scrollbarGutter: style.getPropertyValue('scrollbar-gutter'),
  };
  style.overflow = 'hidden';
  if (hadScrollbar) style.setProperty('scrollbar-gutter', 'stable');
}

function unlock() {
  activeLocks = Math.max(0, activeLocks - 1);
  if (activeLocks > 0 || !saved) return;
  const { style } = document.documentElement;
  style.overflow = saved.overflow;
  if (saved.scrollbarGutter) style.setProperty('scrollbar-gutter', saved.scrollbarGutter);
  else style.removeProperty('scrollbar-gutter');
  saved = null;
}

export function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    lock();
    return unlock;
  }, [locked]);
}
