import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LEGAL_ENTITY, LEGAL_PAGES, isLegalEntityComplete } from '../../config/legal';
import Legal from './Legal';

function renderLegal(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/legal/:page" element={<Legal />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Páginas legales', () => {
  it.each(LEGAL_PAGES)('pinta $title con su título y la navegación', ({ slug, title }) => {
    renderLegal(`/legal/${slug}`);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(document.title).toBe(`${title} · ROCKY 035`);
    const nav = screen.getByRole('navigation', { name: 'Páginas legales' });
    expect(nav.querySelectorAll('a')).toHaveLength(LEGAL_PAGES.length);
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent(title);
  });

  it('el aviso legal enseña los datos del titular y el email de contacto', () => {
    renderLegal('/legal/aviso-legal');
    expect(screen.getByText(LEGAL_ENTITY.titular)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: LEGAL_ENTITY.email })).toHaveAttribute(
      'href',
      `mailto:${LEGAL_ENTITY.email}`
    );
  });

  it('la privacidad explica los avisos de drop y nombra a los encargados', () => {
    renderLegal('/legal/privacidad');
    expect(screen.getByText('Avisos de drop.')).toBeInTheDocument();
    expect(screen.getAllByText(/Resend/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Shopify \(tienda, pagos y cuentas de cliente\)/)).toBeInTheDocument();
  });

  it('la privacidad explica la pared compartida del modo neón', () => {
    renderLegal('/legal/privacidad');
    const pared = screen.getByText('Pared del modo neón.').closest('li');
    expect(pared).toHaveTextContent(/lo ve cualquiera que visite esa página/);
    expect(pared).toHaveTextContent(/firma que genera el servidor/);
    expect(pared).toHaveTextContent(/no guarda tu IP/);
    expect(screen.getByText(/Pintadas de la pared: hasta que otras las tapan/)).toBeInTheDocument();
  });

  it('una página legal que no existe cae en el 404', () => {
    renderLegal('/legal/inventada');
    expect(screen.getByText('Te has salido del mapa')).toBeInTheDocument();
  });

  it('isLegalEntityComplete detecta los datos pendientes', () => {
    expect(isLegalEntityComplete({ a: 'PENDIENTE: x', b: 'ok' })).toBe(false);
    expect(isLegalEntityComplete({ a: 'ok', b: 'ok' })).toBe(true);
  });
  it('una página legal que no existe se titula «No encontrado» y no se indexa', () => {
    renderLegal('/legal/loquesea');
    const robots = [...document.head.querySelectorAll('meta[name="robots"]')].map(
      (meta) => meta.content
    );

    expect(document.title).toBe('No encontrado · ROCKY 035');
    expect(robots).toEqual(['noindex']);
  });
});
