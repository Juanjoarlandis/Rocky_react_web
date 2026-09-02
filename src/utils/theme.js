// Modo neón: la misma calle, de noche. El tema vive en <html data-theme>
// para que mande el CSS; aquí sólo se decide, se guarda y se avisa al
// navegador. El primer arranque lo resuelve public/theme-init.js antes de
// React, para que no parpadee, con esta misma lógica.

import { STORAGE_KEYS } from '../config/storageKeys.js';
import { writeStorage } from './storage.js';

const THEME_KEY = STORAGE_KEYS.theme;

// El color de la barra del navegador acompaña al tema: de día la tinta
// (--ink) que declara index.html, de noche el asfalto del modo neón.
const META_COLORS = { light: '#1a1a1a', neon: '#0c0917' };

export function temaActual() {
  return document.documentElement.dataset.theme === 'neon' ? 'neon' : 'light';
}

export function aplicaTema(tema) {
  const html = document.documentElement;
  if (tema === 'neon') {
    html.dataset.theme = 'neon';
  } else {
    delete html.dataset.theme;
  }
  /* Sin localStorage el interruptor funciona igual, sólo que no se acuerda
     entre visitas. */
  writeStorage(THEME_KEY, tema);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', META_COLORS[tema] || META_COLORS.light);
  }
  return tema;
}

export function alternaTema() {
  return aplicaTema(temaActual() === 'neon' ? 'light' : 'neon');
}
