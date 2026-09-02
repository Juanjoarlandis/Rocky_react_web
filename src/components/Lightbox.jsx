import { useEffect, useRef } from 'react';
import '../styles/components/lightbox.css';

/* Foto a lo grande en un <dialog> nativo: showModal() se ocupa del foco, de
   Escape, de la capa de fondo y de devolver el foco al cerrar. Pinchar fuera
   de la foto también cierra. */
function Lightbox({ src, alt, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
    };
  }, []);

  const closeOnBackdrop = (event) => {
    if (event.target === dialogRef.current) onClose();
  };

  return (
    /* Escape ya cierra por el evento cancel del diálogo; el clic en el fondo es
       un atajo de ratón sin equivalente de teclado que añadir. */
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      className="lightbox"
      aria-label={alt}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={closeOnBackdrop}
    >
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Cerrar">
        ×
      </button>
      <img src={src} alt={alt} className="lightbox-image" />
    </dialog>
  );
}

export default Lightbox;
