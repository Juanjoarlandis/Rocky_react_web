import React from 'react';

// Pegatina hexagonal del estudio para el radiocasete. El fondo miel llega por
// currentColor (`.studio-sticker { color: var(--honey) }`); el trazo y el
// rótulo son la tinta del tema.
export function ColmenaSticker(props) {
    return (
        <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" {...props}>
            <path
                d="M60 8 L104 33 L104 86 L60 112 L16 86 L16 33 Z"
                fill="currentColor"
                stroke="var(--ink)"
                strokeWidth="5"
                strokeLinejoin="round"
            />
            <path
                d="M60 22 L92 40 L92 79 L60 98 L28 79 L28 40 Z"
                fill="none"
                stroke="var(--ink)"
                strokeWidth="3"
                strokeDasharray="7 6"
            />
            <text x="60" y="56" textAnchor="middle" fontFamily="'Luckiest Guy', cursive" fontSize="17" fill="var(--ink)">
                LA
            </text>
            <text x="60" y="78" textAnchor="middle" fontFamily="'Luckiest Guy', cursive" fontSize="17" fill="var(--ink)">
                COLMENA
            </text>
        </svg>
    );
}

export default ColmenaSticker;
