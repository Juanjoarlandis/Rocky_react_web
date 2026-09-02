import { useEffect } from 'react';

export const SITE_TITLE = 'ROCKY 035';

/* «Drops · ROCKY 035», «35 RED · ROCKY 035»… Cada página pone lo suyo y al
   desmontarse deja el título tal como estaba. Sin título, sólo la marca. */
export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${SITE_TITLE}` : SITE_TITLE;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
