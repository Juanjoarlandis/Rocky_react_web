import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Footer from './Footer';

describe('Footer: patrulla de El Lata', () => {
    it('usa una animación PNG con alfa sin depender del croma de WebM', () => {
        const { container } = render(<Footer />);

        const image = container.querySelector('.ticker-lata-image');
        expect(image).toHaveAttribute(
            'src',
            expect.stringContaining('lata-spray-walk-seedance-alpha.png'),
        );
        expect(container.querySelector('.ticker-lata video')).not.toBeInTheDocument();
    });

    it('ofrece un fotograma estático al navegador con movimiento reducido', () => {
        const { container } = render(<Footer />);

        const reducedMotionSource = container.querySelector(
            '.ticker-lata-picture source[media="(prefers-reduced-motion: reduce)"]',
        );
        expect(reducedMotionSource).toHaveAttribute(
            'srcset',
            expect.stringContaining('lata-spray-walk-seedance-poster.png'),
        );
    });
});
