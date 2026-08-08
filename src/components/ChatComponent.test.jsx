import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChatComponent from './ChatComponent.jsx';

const product = {
  handle: 'rockydz-boyz',
  title: 'Rockydz Boyz',
  drop: 'DROP 4',
  image: {
    url: 'https://cdn.shopify.com/rockydz-boyz.jpg',
    alt: 'Camiseta Rockydz Boyz',
  },
  price: { amount: '35.00', currencyCode: 'EUR' },
  availableForSale: true,
  variants: [
    {
      id: 'gid://shopify/ProductVariant/11',
      label: 'S',
      availableForSale: false,
      quantityAvailable: 0,
      price: { amount: '35.00', currencyCode: 'EUR' },
      image: null,
    },
    {
      id: 'gid://shopify/ProductVariant/12',
      label: 'M',
      availableForSale: true,
      quantityAvailable: 3,
      price: { amount: '35.00', currencyCode: 'EUR' },
      image: null,
    },
    {
      id: 'gid://shopify/ProductVariant/13',
      label: 'L',
      availableForSale: true,
      quantityAvailable: 1,
      price: { amount: '40.00', currencyCode: 'EUR' },
      image: null,
    },
  ],
};

const previewProduct = {
  handle: 'rocky-airwave',
  title: 'Airwave',
  drop: 'COLMENA SIGNAL',
  image: {
    url: '/products/rocky-airwave.webp',
    alt: 'Camiseta blanca Airwave con personaje radio',
  },
  price: null,
  availableForSale: false,
  isPreview: true,
  variants: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Rocky IA shopping experience', () => {
  it('submits a quick product prompt and adds the selected trusted variant', async () => {
    const addToCart = vi.fn().mockResolvedValue(null);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        message: 'Te he sacado una que va fina, tío. Mira la ficha.',
        products: [product],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <ChatComponent
          addToCart={addToCart}
          commerceMode="shopify"
          canAddToCart
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /ver camisetas disponibles/i }));

    await screen.findByText(/te he sacado una que va fina/i);
    expect(fetchMock).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ message: 'Ver camisetas disponibles' }),
    }));
    expect(screen.getByRole('link', { name: /ver rockydz boyz/i })).toHaveAttribute(
      'href',
      '/product/rockydz-boyz'
    );
    expect(screen.getByText('3 unidades')).toBeInTheDocument();
    fireEvent.error(screen.getByAltText('Camiseta Rockydz Boyz'));
    expect(await screen.findByRole('img', {
      name: /rockydz boyz — diseño todavía sin revelar/i,
    })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: /talla para rockydz boyz/i }), {
      target: { value: 'gid://shopify/ProductVariant/13' },
    });
    expect(screen.getByText(/40,00/)).toBeInTheDocument();
    expect(screen.getByText('Última unidad')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /añadir al carrito/i }));
    await waitFor(() => {
      expect(addToCart).toHaveBeenCalledWith(
        expect.objectContaining({ handle: 'rockydz-boyz' }),
        'gid://shopify/ProductVariant/13'
      );
    });
  });

  it('shows an honest store state when live cart operations are unavailable', () => {
    render(
      <MemoryRouter>
        <ChatComponent
          addToCart={vi.fn()}
          commerceMode="demo"
          canAddToCart={false}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/catálogo de muestra/i)).toHaveLength(2);
    expect(screen.getByText(/pregunta por diseños/i)).toBeInTheDocument();
  });

  it('presents demo recommendations as previews instead of sold-out stock', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        message: 'La Airwave encaja con lo que buscas.',
        products: [previewProduct],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    ));

    render(
      <MemoryRouter>
        <ChatComponent
          addToCart={vi.fn()}
          commerceMode="demo"
          canAddToCart={false}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /ver camisetas disponibles/i }));

    expect(await screen.findByText('Vista previa')).toBeInTheDocument();
    expect(screen.getByText('Concepto de prueba')).toBeInTheDocument();
    expect(screen.queryByText('Agotada')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver airwave/i })).toHaveAttribute(
      'href',
      '/product/rocky-airwave'
    );
  });

  it('never exposes a preview concept as a Shopify add-to-cart action', async () => {
    const addToCart = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        message: 'Airwave es un concepto de la casa.',
        products: [previewProduct],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    ));

    render(
      <MemoryRouter>
        <ChatComponent
          addToCart={addToCart}
          commerceMode="shopify"
          canAddToCart
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /ver camisetas disponibles/i }));

    expect(await screen.findByText('Vista previa')).toBeInTheDocument();
    expect(screen.queryByText('Agotada')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver producto/i })).toHaveAttribute(
      'href',
      '/product/rocky-airwave'
    );
    expect(screen.queryByRole('button', { name: /añadir al carrito/i })).not.toBeInTheDocument();
    expect(addToCart).not.toHaveBeenCalled();
  });
});
