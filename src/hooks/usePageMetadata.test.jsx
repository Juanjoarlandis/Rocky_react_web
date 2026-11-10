import { act, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { useCanonicalUrl, useNotFound } from './usePageMetadata.js';
import { canonicalUrl } from '../../shared/routes.mjs';

const canonical = () => document.head.querySelector('link[rel="canonical"]')?.href ?? null;
const ogUrl = () => document.head.querySelector('meta[property="og:url"]')?.content ?? null;
const robots = () =>
  [...document.head.querySelectorAll('meta[name="robots"]')].map((m) => m.content);

afterEach(() => {
  document.head
    .querySelectorAll('link[rel="canonical"], meta[property="og:url"], meta[name="robots"]')
    .forEach((node) => node.remove());
  document.title = '';
});

let navigate;
function Shell({ children }) {
  useCanonicalUrl();
  navigate = useNavigate();
  return children ?? null;
}
const montar = (ruta, children) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Shell>{children}</Shell>
    </MemoryRouter>
  );

describe('useCanonicalUrl', () => {
  it('crea el canónico y el og:url de la ruta, sin parámetros', () => {
    montar('/product/rocky-racing?utm_source=x');
    expect(canonical()).toBe('https://rocky035.com/product/rocky-racing');
    expect(ogUrl()).toBe('https://rocky035.com/product/rocky-racing');
  });

  it('los actualiza al navegar sin recargar y no los duplica', () => {
    montar('/');
    expect(canonical()).toBe('https://rocky035.com/');
    act(() => navigate('/crew'));
    expect(canonical()).toBe('https://rocky035.com/crew');
    expect(ogUrl()).toBe('https://rocky035.com/crew');
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[property="og:url"]')).toHaveLength(1);
  });

  it('usa la misma función que el servidor', () => {
    for (const ruta of ['/', '/products', '/crew/', '/legal/cookies', '/menudrop']) {
      const view = montar(ruta);
      expect(canonical()).toBe(canonicalUrl('https://rocky035.com', ruta));
      view.unmount();
    }
  });

  it('una ruta que no existe o una categoría por nombre no declaran canónica', () => {
    montar('/');
    act(() => navigate('/loquesea'));
    expect(canonical()).toBeNull();
    expect(ogUrl()).toBeNull();
    act(() => navigate('/products/ROCKY%20DROP%204'));
    expect(canonical()).toBeNull();
    act(() => navigate('/products/rocky-drop-4'));
    expect(canonical()).toBe('https://rocky035.com/products/rocky-drop-4');
  });
});

describe('useNotFound', () => {
  function Perdida({ active }) {
    useNotFound(active);
    return null;
  }

  it('titula «No encontrado» y pide que no se indexe mientras está en pantalla', () => {
    document.title = 'ROCKY 035';
    const view = render(<Perdida />);
    expect(document.title).toBe('No encontrado · ROCKY 035');
    expect(robots()).toEqual(['noindex']);
    view.unmount();
    expect(document.title).toBe('ROCKY 035');
    expect(robots()).toEqual([]);
  });

  it('no marca nada mientras no está activo (el catálogo aún carga)', () => {
    document.title = 'Cargando';
    const view = render(<Perdida active={false} />);
    expect(document.title).toBe('Cargando');
    expect(robots()).toEqual([]);
    view.rerender(<Perdida active />);
    expect(robots()).toEqual(['noindex']);
    view.rerender(<Perdida active={false} />);
    expect(robots()).toEqual([]);
  });

  it('al volver a una página que existe el noindex desaparece', () => {
    montar(
      '/no-existe',
      <Routes>
        <Route path="/" element={<p>Portada</p>} />
        <Route path="*" element={<Perdida />} />
      </Routes>
    );
    expect(robots()).toEqual(['noindex']);
    act(() => navigate('/'));
    expect(robots()).toEqual([]);
  });
});
