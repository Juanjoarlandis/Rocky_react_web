import { useEffect, useRef } from 'react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll.js';
import MapaDelBarrio from './MapaDelBarrio.jsx';

/* El mapa de Lacoma desde el pie (barrio-en-mapa): un <dialog> nativo, como el
   lightbox. showModal() se ocupa del foco, de Escape y del fondo. Al cerrarse,
   el foco vuelve a `vuelveA` (el botón del pie, por ref: Safari no enfoca un
   botón al pulsarlo, así que document.activeElement no sirve). Ir a un sitio
   lo cierra sin devolver el foco al pie, que ya es otra página. No se llama a
   close() en la limpieza, por lo mismo que en el lightbox (StrictMode); en su
   doble montaje el foco al pie no llega, porque el diálogo sigue abierto y el
   resto de la página está inerte. */
export default function MapaDialogo({ onClose, vuelveA }) {
  const dialogRef = useRef(null);
  const seVa = useRef(false);
  useLockBodyScroll(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    // El botón del pie ya está pintado cuando se abre el diálogo, y no cambia.
    const opener = vuelveA?.current;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    dialog.querySelector('button')?.focus();
    return () => {
      if (!seVa.current && opener?.isConnected) opener.focus();
    };
  }, [vuelveA]);

  return (
    <dialog
      ref={dialogRef}
      className="mapa-dialogo"
      aria-label="El mapa de Lacoma"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button type="button" className="btn mapa-dialogo-cerrar" onClick={onClose}>
        Cerrar el mapa
      </button>
      <MapaDelBarrio
        onIr={() => {
          seVa.current = true;
          onClose();
        }}
      />
    </dialog>
  );
}
