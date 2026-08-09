import React from 'react';
import { useMusic } from '../context/MusicContext';

// Radiocasete dibujado a mano: la mesa de control de la radio global.
// Play/pausa, anterior/siguiente, barra de progreso con seek y ruedas
// del casete girando mientras suena.

export function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

// El dibujo del aparato: altavoces con diana y casete con ruedas que giran
function BoomboxArt({ playing }) {
    return (
        <svg
            viewBox="0 0 640 330"
            xmlns="http://www.w3.org/2000/svg"
            className={`bb-art ${playing ? 'playing' : ''}`}
            role="img"
            aria-label="Radiocasete de ROCKY SOUND"
        >
            {/* Antena */}
            <path d="M556 62 L618 14" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" />
            <circle cx="621" cy="11" r="6" fill="#e63946" stroke="#1a1a1a" strokeWidth="3.5" />
            {/* Asa */}
            <path
                d="M200 62 Q200 18 250 16 L390 16 Q440 18 440 62"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="7"
                strokeLinecap="round"
            />
            {/* Cuerpo */}
            <path
                d="M32 74 Q24 76 24 86 L26 288 Q26 300 38 302 L602 300 Q614 300 614 288 L612 84 Q612 72 600 72 L44 72 Q36 72 32 74 Z"
                fill="#fffdf8"
                stroke="#1a1a1a"
                strokeWidth="6.5"
                strokeLinejoin="round"
            />
            {/* Rejilla superior */}
            <path d="M52 96 L588 94" stroke="#1a1a1a" strokeWidth="3.5" strokeDasharray="10 8" strokeLinecap="round" />
            {/* Altavoz izquierdo: la diana de la casa */}
            <g className="bb-diana">
                <circle cx="128" cy="196" r="64" fill="#fffdf8" stroke="#1a1a1a" strokeWidth="6" />
                <circle cx="128" cy="196" r="42" fill="none" stroke="#1a1a1a" strokeWidth="4.5" />
                <circle cx="128" cy="196" r="20" fill="none" stroke="#e63946" strokeWidth="4.5" />
                <path d="M128 132 L128 156 M128 236 L128 260 M64 196 L88 196 M168 196 L192 196" stroke="#e63946" strokeWidth="5" strokeLinecap="round" />
                <circle cx="128" cy="196" r="5" fill="#1a1a1a" />
            </g>
            {/* Altavoz derecho */}
            <g className="bb-diana">
                <circle cx="512" cy="196" r="64" fill="#fffdf8" stroke="#1a1a1a" strokeWidth="6" />
                <circle cx="512" cy="196" r="42" fill="none" stroke="#1a1a1a" strokeWidth="4.5" />
                <circle cx="512" cy="196" r="20" fill="none" stroke="#e63946" strokeWidth="4.5" />
                <path d="M512 132 L512 156 M512 236 L512 260 M448 196 L472 196 M552 196 L576 196" stroke="#e63946" strokeWidth="5" strokeLinecap="round" />
                <circle cx="512" cy="196" r="5" fill="#1a1a1a" />
            </g>
            {/* Ventana del casete */}
            <rect x="228" y="130" width="184" height="102" rx="12" fill="#fffdf8" stroke="#1a1a1a" strokeWidth="5.5" />
            <rect x="244" y="144" width="152" height="34" rx="8" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeDasharray="8 6" />
            {/* Ruedas del casete */}
            <g className="bb-spool">
                <circle cx="282" cy="200" r="17" fill="#fffdf8" stroke="#1a1a1a" strokeWidth="4.5" />
                <path d="M282 187 L282 213 M269 200 L295 200" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />
            </g>
            <g className="bb-spool">
                <circle cx="358" cy="200" r="17" fill="#fffdf8" stroke="#1a1a1a" strokeWidth="4.5" />
                <path d="M358 187 L358 213 M345 200 L371 200" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />
            </g>
            {/* Cinta entre ruedas */}
            <path d="M299 200 L341 200" stroke="#1a1a1a" strokeWidth="3" strokeDasharray="5 5" />
            {/* Marca */}
            <text x="320" y="168" textAnchor="middle" fontFamily="'Luckiest Guy', cursive" fontSize="21" fill="#1a1a1a">
                ROCKY SOUND
            </text>
            {/* Patas */}
            <path d="M70 302 L66 318 M570 300 L574 316" stroke="#1a1a1a" strokeWidth="6" strokeLinecap="round" />
        </svg>
    );
}

export function IconPrev() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M6 4 L6 20 M19 5 L9 12 L19 19 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

export function IconNext() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M18 4 L18 20 M5 5 L15 12 L5 19 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

export function IconPlay() {
    return (
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M7 4 L20 12 L7 20 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
}

export function IconPause() {
    return (
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M7 4 L7 20 M17 4 L17 20" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
    );
}

function Boombox() {
    const { track, playing, time, duration, toggle, next, prev, seek } = useMusic();

    const progress = duration ? (time / duration) * 100 : 0;

    return (
        <div className="boombox">
            <BoomboxArt playing={playing} />

            <p className="bb-now" aria-live="polite">
                {playing ? 'Sonando' : 'En pausa'}: <strong>{track.title}</strong>
            </p>

            <input
                type="range"
                className="bb-progress"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={(event) => seek(Number(event.target.value) / 100)}
                aria-label="Progreso del tema"
            />

            <div className="bb-controls">
                <span className="bb-time">{formatTime(time)}</span>
                <button type="button" className="player-btn" onClick={prev} aria-label="Tema anterior">
                    <IconPrev />
                </button>
                <button
                    type="button"
                    className="player-btn player-btn-main"
                    onClick={toggle}
                    aria-label={playing ? 'Pausar' : 'Reproducir'}
                >
                    {playing ? <IconPause /> : <IconPlay />}
                </button>
                <button type="button" className="player-btn" onClick={next} aria-label="Tema siguiente">
                    <IconNext />
                </button>
                <span className="bb-time">{formatTime(duration)}</span>
            </div>
        </div>
    );
}

export default Boombox;
