/* La secuencia secreta de la Estampida. Vive aparte de la pieza para que App
   pueda escucharla sin cargar a toda la crew: la Estampida se pide cuando
   alguien la teclea. */
export const SECRET = '035';

function isEditable(target) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

// Llama a `onMatch` cada vez que se teclea la secuencia fuera de un campo de
// texto. Devuelve la función que deja de escuchar.
export function listenForSecret(onMatch) {
  let typed = '';
  const onKeyDown = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditable(event.target)) {
      typed = '';
      return;
    }
    if (event.key.length !== 1) return;
    typed = (typed + event.key).slice(-SECRET.length);
    if (typed === SECRET) {
      typed = '';
      onMatch();
    }
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
