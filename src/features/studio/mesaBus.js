/* Un solo altavoz en La Colmena: si arranca la mesa, calla el ranking, y al
   revés; y si arranca la radio, callan los dos. Cada reproductor avisa al
   empezar y escucha a los demás. */

const EVENT = 'rocky:colmena-suena';

export function announcePlaying(source) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { source } }));
}

export function onOtherPlaying(source, handler) {
  const listener = (event) => {
    if (event.detail?.source !== source) handler();
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

// Cuando se publica un beat, el ranking se entera y lo enseña.
const PUBLISHED = 'rocky:beat-publicado';

export function announcePublished(beat) {
  window.dispatchEvent(new CustomEvent(PUBLISHED, { detail: { beat } }));
}

export function onPublished(handler) {
  const listener = (event) => handler(event.detail?.beat);
  window.addEventListener(PUBLISHED, listener);
  return () => window.removeEventListener(PUBLISHED, listener);
}
