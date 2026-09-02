import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import MenuDrop, { summarizeDrops } from './MenuDrop.jsx';
import previewProducts from '../../../server/preview-products.mjs';
import demoCatalog from '../../data/demoCatalog.json';
import { normalizeDemoCatalog } from '../storefront/normalize.js';

const products = [...normalizeDemoCatalog(demoCatalog), ...previewProducts];

describe('Drops', () => {
  it('resume cada drop con su handle, cuántos diseños tiene y en qué estado está', () => {
    const drops = summarizeDrops(products);
    expect(drops[0]).toMatchObject({
      handle: 'rocky-drop-4',
      title: 'ROCKY DROP 4',
      total: 22,
      locked: 19,
      previews: 0,
      state: 'Sin revelar',
    });
    expect(drops.find((drop) => drop.handle === 'asphalt-afterdark')).toMatchObject({
      total: 2,
      previews: 2,
      state: 'Concepto',
    });
  });

  it('enlaza cada drop por su handle y muestra contador y estado', () => {
    render(
      <MemoryRouter>
        <MenuDrop products={products} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /ROCKY DROP 4/ })).toHaveAttribute(
      'href',
      '/products/rocky-drop-4'
    );
    expect(screen.getByText('22 diseños · 19 bajo llave')).toBeInTheDocument();
    expect(screen.getByText('Sin revelar')).toBeInTheDocument();
    expect(screen.getAllByText('Concepto')).toHaveLength(3);
    expect(screen.getByText(`${products.length} diseños`)).toBeInTheDocument();
  });
});
