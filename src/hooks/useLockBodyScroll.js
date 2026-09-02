import { useEffect } from 'react';

/* Bloquea el scroll del documento mientras `locked` sea true (hojas, menús,
   lightbox) y devuelve el valor anterior al soltar, para no pisar lo que
   otro haya dejado puesto (el splash, por ejemplo). */
export function useLockBodyScroll(locked) {
    useEffect(() => {
        if (!locked) return undefined;
        const { body } = document;
        const previous = body.style.overflow;
        body.style.overflow = 'hidden';
        return () => {
            body.style.overflow = previous;
        };
    }, [locked]);
}
