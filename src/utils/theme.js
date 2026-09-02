// Modo neón: la misma calle, de noche. El tema vive en <html data-theme>
// para que mande el CSS; aquí sólo se decide, se guarda y se avisa al
// navegador. El primer arranque lo resuelve public/theme-init.js antes de
// React, para que no parpadee, con esta misma lógica.

const THEME_KEY = 'rocky-theme';

// El color de la barra del navegador acompaña al tema. El de día es el que
// la web llevaba de siempre en index.html.
const META_COLORS = { light: '#141414', neon: '#0c0917' };

export function temaActual() {
    return document.documentElement.dataset.theme === 'neon'
        ? 'neon'
        : 'light';
}

export function aplicaTema(tema) {
    const html = document.documentElement;
    if (tema === 'neon') {
        html.dataset.theme = 'neon';
    } else {
        delete html.dataset.theme;
    }
    try {
        localStorage.setItem(THEME_KEY, tema);
    } catch {
        /* Sin localStorage el interruptor funciona igual, sólo que no se
           acuerda entre visitas. */
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', META_COLORS[tema] || META_COLORS.light);
    }
    return tema;
}

export function alternaTema() {
    return aplicaTema(temaActual() === 'neon' ? 'light' : 'neon');
}
