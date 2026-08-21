import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Footer from './Footer';

describe('Footer: patrulla de El Lata', () => {
    it('usa el WebP animado con alfa, sin vídeo ni APNG gigante', () => {
        const { container } = render(<Footer />);

        const image = container.querySelector('.ticker-lata-image');
        expect(image).toHaveAttribute(
            'src',
            expect.stringContaining('lata-spray-walk-seedance-224.webp'),
        );
        // Se sirve a tamaño de pantalla, no al del render original.
        expect(image).toHaveAttribute('width', '166');
        expect(image).toHaveAttribute('height', '224');
        // La marquesina vive al fondo de la página: no debe cargar de entrada.
        expect(image).toHaveAttribute('loading', 'lazy');
        expect(container.querySelector('.ticker-lata video')).not.toBeInTheDocument();
    });

    it('ofrece un fotograma estático al navegador con movimiento reducido', () => {
        const { container } = render(<Footer />);

        const reducedMotionSource = container.querySelector(
            '.ticker-lata-picture source[media="(prefers-reduced-motion: reduce)"]',
        );
        expect(reducedMotionSource).toHaveAttribute(
            'srcset',
            expect.stringContaining('lata-spray-walk-seedance-poster-224.webp'),
        );
    });
});
