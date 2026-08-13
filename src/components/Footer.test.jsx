import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Footer from './Footer';

function mediaQuery({ reducedMotion = false } = {}) {
    const listeners = new Set();
    const query = {
        matches: reducedMotion,
        addEventListener: vi.fn((event, listener) => listeners.add(listener)),
        removeEventListener: vi.fn((event, listener) => listeners.delete(listener)),
    };
    vi.stubGlobal('matchMedia', vi.fn(() => query));
    return query;
}

describe('Footer: patrulla de El Lata', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('reproduce en bucle el vídeo transparente sin controles ni audio', () => {
        mediaQuery();
        const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
        const { container } = render(<Footer />);

        const video = container.querySelector('.ticker-lata-video');
        expect(video).toHaveAttribute('autoplay');
        expect(video).toHaveAttribute('loop');
        expect(video).toHaveAttribute('playsinline');
        expect(video).not.toHaveAttribute('controls');
        expect(video.muted).toBe(true);
        expect(video.playbackRate).toBe(1.5);
        expect(play).toHaveBeenCalledOnce();
    });

    it('pausa el vídeo en el primer fotograma con movimiento reducido', () => {
        mediaQuery({ reducedMotion: true });
        const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
        const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
        const { container } = render(<Footer />);

        const video = container.querySelector('.ticker-lata-video');
        expect(pause).toHaveBeenCalledOnce();
        expect(play).not.toHaveBeenCalled();
        expect(video.currentTime).toBe(0);
    });
});
