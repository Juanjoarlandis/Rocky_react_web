import React, { useEffect } from 'react';
import '../styles/Lightbox.css';

function Lightbox({ src, alt, onClose }) {
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label={alt}>
            <button className="lightbox-close" onClick={onClose} aria-label="Cerrar">
                ×
            </button>
            <img
                src={src}
                alt={alt}
                className="lightbox-image"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

export default Lightbox;
