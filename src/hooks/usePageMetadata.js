import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { canonicalUrl } from '../../shared/routes.mjs';
import { SITE_ORIGIN } from '../config/links.js';
import { SITE_TITLE } from './useDocumentTitle.js';

/* Lo que cada página dice de sí misma en el <head> (seo-y-cache). El HTML
   servido es el mismo para todas las rutas, así que estas etiquetas las pone
   y las quita la aplicación al navegar. */

function upsert(selector, create) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  return element;
}

const CANONICAL = 'link[rel="canonical"]';
const OG_URL = 'meta[property="og:url"]';

/* Mantiene el `<link rel="canonical">` y el `og:url` de la ruta en la que se
   está, con la misma función que usa el servidor para su cabecera `Link`.
   Una ruta sin canónica (la que no existe, o una categoría abierta por su
   nombre) no declara ninguna. Se monta una sola vez, en App. */
export function useCanonicalUrl() {
  const { pathname } = useLocation();
  useEffect(() => {
    const url = canonicalUrl(SITE_ORIGIN, pathname);
    if (!url) {
      document.head.querySelector(CANONICAL)?.remove();
      document.head.querySelector(OG_URL)?.remove();
      return;
    }
    upsert(CANONICAL, () => {
      const link = document.createElement('link');
      link.rel = 'canonical';
      return link;
    }).href = url;
    upsert(OG_URL, () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:url');
      return meta;
    }).content = url;
  }, [pathname]);
}

export const NOT_FOUND_TITLE = 'No encontrado';

/* Una sola etiqueta `noindex` aunque la pidan dos a la vez (una página legal
   que no existe pinta dentro el 404): se quita cuando la suelta el último. */
let noIndexHolders = 0;
let noIndexMeta = null;

function holdNoIndex() {
  noIndexHolders += 1;
  if (!noIndexMeta) {
    noIndexMeta = document.createElement('meta');
    noIndexMeta.name = 'robots';
    noIndexMeta.content = 'noindex';
    document.head.appendChild(noIndexMeta);
  }
  return () => {
    noIndexHolders -= 1;
    if (noIndexHolders === 0) {
      noIndexMeta.remove();
      noIndexMeta = null;
    }
  };
}

/* Mientras `active`, la página se titula «No encontrado · ROCKY 035» y pide
   que no se indexe; al dejar de estarlo (o al desmontarse) el título vuelve a
   ser el que había y la etiqueta desaparece. Lo usan el 404 y los estados de
   producto, categoría y página legal que no existen. */
export function useNotFound(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const title = `${NOT_FOUND_TITLE} · ${SITE_TITLE}`;
    const previous = document.title;
    document.title = title;
    const release = holdNoIndex();
    return () => {
      // Solo se deshace el título si sigue siendo el nuestro: la página que
      // llega después puede haber puesto ya el suyo.
      if (document.title === title) document.title = previous;
      release();
    };
  }, [active]);
}
