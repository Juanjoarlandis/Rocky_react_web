import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router';

/* Cada navegación nueva arranca arriba; al volver atrás (POP) el navegador
   ya restaura por dónde ibas y no hay que quitárselo. */
function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP') return;
    window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return null;
}
export default ScrollToTop;
