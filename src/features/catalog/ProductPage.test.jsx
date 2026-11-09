import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import ProductPage from './ProductPage.jsx';
import { normalizeDemoCatalog } from '../storefront/normalize.js';
import { isTornFlipped } from './tornVariant.js';

const productPageCss = readFileSync('src/styles/pages/home.css', 'utf8');

const previewProducts = [
  {
    id: 'rocky-night-runner',
    handle: 'rocky-night-runner',
    title: 'Night Runner',
    drop: 'ASPHALT AFTERDARK',
    dropHandle: 'asphalt-afterdark',
    image: '/products/rocky-night-runner.webp',
    imageAlt: 'Camiseta negra Night Runner',
    price: null,
    isPreview: true,
  },
  {
    id: 'rocky-pit-crew',
    handle: 'rocky-pit-crew',
    title: 'Pit Crew 035',
    drop: 'ASPHALT AFTERDARK',
    dropHandle: 'asphalt-afterdark',
    image: '/products/rocky-pit-crew.webp',
    imageAlt: 'Camiseta gris Pit Crew 035',
    price: null,
    isPreview: true,
  },
];

describe('ProductPage preview drops', () => {
  it('opens the home with an editorial intro and a working jump to the catalog', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductPage
          products={previewProducts}
          addToCart={vi.fn()}
          commerceMode="shopify"
          canAddToCart
        />
      </MemoryRouter>
    );

    const heading = screen.getByRole('heading', { level: 1, name: 'ROCKY 035' });
    const tagline = screen.getByText('HECHO DESDE LA COLMENA');
    // Sin drop destacado la portada no anuncia ninguno: salta al catálogo.
    const catalogLink = screen.getByRole('link', { name: 'Ver el catálogo' });
    const productGrid = container.querySelector('.product-grid');

    expect(catalogLink).toHaveAttribute('href', '#productos');
    expect(productGrid).toHaveAttribute('id', 'productos');
    expect(screen.getByText('2 diseños')).toBeInTheDocument();
    expect(
      heading.compareDocumentPosition(tagline) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      catalogLink.compareDocumentPosition(productGrid) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('reserves the catalog footprint while Shopify is loading', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductPage products={[]} addToCart={vi.fn()} commerceMode="checking" loading />
      </MemoryRouter>
    );

    const productGrid = container.querySelector('.product-grid');
    expect(productGrid).toHaveClass('product-grid--loading');
    expect(productGrid).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the editorial drop title and keeps preview products out of the cart', () => {
    render(
      <MemoryRouter initialEntries={['/products/asphalt-afterdark']}>
        <Routes>
          <Route
            path="/products/:category"
            element={
              <ProductPage
                products={previewProducts}
                addToCart={vi.fn()}
                commerceMode="shopify"
                canAddToCart
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ASPHALT AFTERDARK');
    expect(screen.getByText('2 diseños')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Vista previa' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /añadir al carrito/i })).not.toBeInTheDocument();
    expect(screen.queryByText('HECHO DESDE LA COLMENA')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver el catálogo' })).not.toBeInTheDocument();
  });
});

describe('ProductPage catalog grouping', () => {
  const demoProducts = [
    ...normalizeDemoCatalog([
      {
        id: 1,
        drop: 'ROCKY DROP 4',
        title: '35 RED',
        specifications: ['Próximamente'],
        price: '??',
        image: '/products/placeholder-unreleased.webp',
      },
      {
        id: 2,
        drop: 'ROCKY DROP 4',
        title: '35 WHITE',
        specifications: ['Próximamente'],
        price: '??',
        image: '/products/placeholder-unreleased.webp',
      },
      {
        id: 15,
        drop: 'ROCKY DROP 4',
        title: 'RockyRacing',
        price: '??',
        image: '/products/rocky-racing.webp',
      },
      {
        id: 3,
        drop: 'ROCKY DROP 4',
        title: 'Dots',
        price: '??',
        image: '/products/placeholder-unreleased.webp',
      },
    ]),
    ...previewProducts,
  ];

  /* sistema-de-drops: del drop anunciado solo sale su cartel teaser, sin
     nombres; un producto sin foto se ve como uno más (H-019). */
  const teaserDrop = {
    handle: 'rocky-drop-4',
    number: 4,
    title: 'ROCKY DROP 4',
    tagline: 'Lo que viene',
    story: '',
    poster: null,
    launchAt: '2099-01-01T19:00:00Z',
    endsAt: null,
    state: 'anunciado',
    designCount: 4,
    designs: null,
    soldOut: false,
  };

  it('del drop anunciado enseña su cartel teaser y ningún diseño suyo', () => {
    render(
      <MemoryRouter>
        <ProductPage
          products={demoProducts}
          addToCart={vi.fn()}
          commerceMode="demo"
          drops={[teaserDrop]}
          featured={teaserDrop}
          serverNow={() => Date.now()}
        />
      </MemoryRouter>
    );

    const teaser = screen.getByRole('article', { name: 'ROCKY DROP 4' });
    expect(teaser).toHaveClass('cartel--compacto');
    expect(screen.queryByText(/35 RED|35 WHITE|Dots|RockyRacing/)).not.toBeInTheDocument();
    expect(screen.getByText('4 diseños bajo llave')).toBeInTheDocument();
    // Los conceptos de otro drop siguen saliendo.
    expect(screen.getByRole('heading', { level: 2, name: 'Night Runner' })).toBeInTheDocument();
  });

  it('un producto sin foto sale como una tarjeta más, sin esconderse bajo llave', () => {
    render(
      <MemoryRouter>
        <ProductPage products={demoProducts} addToCart={vi.fn()} commerceMode="demo" />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('locked-designs')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '35 RED' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /35 RED — sin foto todavía/ })).toBeInTheDocument();
  });

  it('sin precio conocido ofrece «Avísame» en vez de «Añadir al carrito», en cualquier modo', () => {
    render(
      <MemoryRouter>
        <ProductPage products={demoProducts} addToCart={vi.fn()} commerceMode="demo" canAddToCart />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: /añadir al carrito/i })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Avísame' }).map((link) => link.getAttribute('href'))
    ).toContain('/product/rockyracing#aviso');
    expect(screen.getAllByRole('button', { name: 'Vista previa' })).toHaveLength(
      previewProducts.length
    );
  });
});

describe('ProductPage hero motion', () => {
  function pintarEncabezado() {
    return render(
      <MemoryRouter>
        <ProductPage
          products={previewProducts}
          addToCart={vi.fn()}
          commerceMode="shopify"
          canAddToCart
        />
      </MemoryRouter>
    );
  }

  it('el grafitero usa el dibujo sin el chorro pintado', () => {
    const { container } = pintarEncabezado();
    // Si volviera el dibujo con los puntos, se verían dos chorros: el pintado
    // encima del animado.
    expect(container.querySelector('.spray-guy').getAttribute('src')).toMatch(
      /grafitero-sin-chorro/
    );
    expect(container.querySelectorAll('.spray-chorro i')).toHaveLength(3);
  });

  it('la línea se revela entera y desde la punta del bote', () => {
    const { container } = pintarEncabezado();
    const trazo = container.querySelector('.spray-line path');

    // El trazo lleva `non-scaling-stroke`, así que el guion se mide en píxeles
    // de pantalla: tiene que ser más largo que la pista o la línea sale a rayas.
    expect(trazo).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    expect(productPageCss).toMatch(
      /\.spray-line\s+path\s*\{[^}]*stroke-dasharray:\s*100cqw\s+100cqw;/
    );
    // Negativo: se descubre desde el final del trazo hacia atrás, que es donde
    // está el bote. En positivo saldría del lado contrario al que rocía.
    expect(productPageCss).toMatch(/\.spray-line\s+path\s*\{[^}]*stroke-dashoffset:\s*-95cqw;/);
    expect(productPageCss).toMatch(
      /@keyframes\s+spray-linea\s*\{[^}]*\{[^}]*stroke-dashoffset:\s*0;/
    );
  });

  it('la escena pasa una sola vez y no se repite', () => {
    const escena = productPageCss.slice(
      productPageCss.indexOf('.spray-line-wrap {'),
      productPageCss.indexOf('.product-grid {')
    );
    expect(escena).not.toMatch(/animation:[^;]*infinite/);
  });

  it('la Cruiser tiene un único sitio de reposo', () => {
    const sitios = [
      ...productPageCss.matchAll(/^[^{\n]*\.spray-cruiser[^\n{]*\{[^}]*?left:\s*([^;]+);/gm),
    ].map((m) => m[1].trim());

    expect(sitios).toEqual(['4%']);
  });

  it('con movimiento reducido la escena queda quieta y terminada', () => {
    const reducido = productPageCss.slice(
      productPageCss.indexOf('@media (prefers-reduced-motion: reduce)')
    );

    // La línea, pintada del todo; nadie se queda con media raya.
    expect(reducido).toMatch(
      /\.spray-line\s+path\s*\{[^}]*animation:\s*none;[^}]*stroke-dashoffset:\s*0;/
    );
    expect(reducido).toMatch(/\.spray-cruiser\s*\{[^}]*animation:\s*none;/);
    // Y sin chorro, que sin animación serían tres puntos clavados en el aire.
    expect(reducido).toMatch(/\.spray-chorro\s*\{[^}]*display:\s*none;/);
  });
});

describe('ProductPage card anatomy', () => {
  it('cada tarjeta lleva su título como encabezado, la foto con lupa y dos acciones con nombre', () => {
    render(
      <MemoryRouter>
        <ProductPage
          products={previewProducts}
          addToCart={vi.fn()}
          commerceMode="shopify"
          canAddToCart
        />
      </MemoryRouter>
    );
    const card = screen
      .getByRole('heading', { level: 2, name: 'Night Runner' })
      .closest('.product-card');
    expect(card).not.toBeNull();
    expect(within(card).getByRole('button', { name: 'Ver Night Runner en grande' })).toBeEnabled();
    expect(within(card).getByRole('link', { name: 'Detalles' })).toHaveAttribute(
      'href',
      '/product/rocky-night-runner'
    );
    expect(within(card).getByRole('button', { name: 'Vista previa' })).toBeDisabled();
    const image = within(card).getByRole('img', { name: /Night Runner/ });
    expect(image).toHaveAttribute('width');
    expect(image).toHaveAttribute('height');
  });

  it('la portada presenta el título, el lema, el contador y un salto real al catálogo', () => {
    render(
      <MemoryRouter>
        <ProductPage
          products={previewProducts}
          addToCart={vi.fn()}
          commerceMode="shopify"
          canAddToCart
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ROCKY 035');
    expect(screen.getByText('HECHO DESDE LA COLMENA')).toBeInTheDocument();
    expect(screen.getByText(`${previewProducts.length} diseños`)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Ver el catálogo' });
    expect(cta).toHaveAttribute('href', '#productos');
    expect(document.getElementById('productos')).not.toBeNull();
    expect(document.title).toBe('ROCKY 035');
  });
});

/* Ideas 2 y 7 de dirección artística (cambio punto-de-mira-tippex-y-pegatinas). */
const productMediaCss = readFileSync('src/styles/components/product-media.css', 'utf8');

const forSale = {
  id: 'rocky-airwave',
  handle: 'rocky-airwave',
  title: 'Airwave',
  drop: 'DROP 4',
  dropHandle: 'drop-4',
  image: '/products/rocky-airwave.webp',
  imageAlt: 'Camiseta blanca Airwave',
  price: { amount: '29.00', currencyCode: 'EUR' },
  defaultVariantId: 'gid://shopify/ProductVariant/10',
  availableForSale: true,
};
const soldOut = {
  ...forSale,
  id: 'rocky-marea',
  handle: 'rocky-marea',
  title: 'Marea',
  image: '/products/rocky-marea-035.webp',
  imageAlt: 'Camiseta azul Marea',
  defaultVariantId: 'gid://shopify/ProductVariant/11',
  availableForSale: false,
};

function renderCatalog(products, addToCart = vi.fn()) {
  return render(
    <MemoryRouter>
      <ProductPage products={products} addToCart={addToCart} commerceMode="shopify" canAddToCart />
    </MemoryRouter>
  );
}

const cardOf = (title) =>
  screen.getByRole('heading', { level: 2, name: title }).closest('.product-card');

describe('ProductPage: punto de mira', () => {
  it('la foto de cada tarjeta lleva la mira decorativa y conserva su nombre', () => {
    renderCatalog([forSale]);
    const media = within(cardOf('Airwave')).getByRole('button', {
      name: 'Ver Airwave en grande',
    });
    const reticle = media.querySelector('svg.product-reticle');
    expect(reticle).not.toBeNull();
    expect(reticle).toHaveAttribute('aria-hidden', 'true');
    expect(reticle.querySelector('.product-reticle-aim')).not.toBeNull();
    // El trazo no crece con la foto: 3 px de rotulador también en la ficha grande.
    const paths = [...reticle.querySelectorAll('path')];
    expect(paths.length).toBeGreaterThan(0);
    paths.forEach((path) => expect(path).toHaveAttribute('vector-effect', 'non-scaling-stroke'));
    // La pegatina del impacto es un elemento propio, de tamaño fijo, fuera del SVG.
    const hit = media.querySelector('.product-reticle-hit');
    expect(hit).not.toBeNull();
    expect(hit.closest('svg')).toBeNull();
    expect(hit).toHaveAttribute('aria-hidden', 'true');
  });

  it('un agotado no lleva mira: no se apunta a lo que no se puede comprar', () => {
    renderCatalog([forSale, soldOut]);
    const media = within(cardOf('Marea')).getByRole('button', { name: 'Ver Marea en grande' });
    expect(media.querySelector('.product-reticle')).toBeNull();
    expect(media.querySelector('.product-reticle-hit')).toBeNull();
  });

  it('el impacto queda en la tarjeta que añadió, y no si el añadido falla', async () => {
    const addToCart = vi
      .fn()
      .mockResolvedValueOnce({ added: false })
      .mockResolvedValueOnce({ added: true });
    renderCatalog([forSale, { ...forSale, id: 'otra', handle: 'otra', title: 'Otra' }], addToCart);
    const card = cardOf('Airwave');
    const other = cardOf('Otra');
    const button = within(card).getByRole('button', { name: 'Añadir al carrito' });

    fireEvent.click(button);
    await waitFor(() => expect(within(card).getByRole('alert')).toBeInTheDocument());
    expect(card.querySelector('.btn--added')).toBeNull();

    fireEvent.click(button);
    await waitFor(() => expect(card.querySelector('.btn--added')).not.toBeNull());
    expect(other.querySelector('.btn--added')).toBeNull();
    // Lo que pinta el impacto: la tarjeta casa con el selector de la hoja y
    // contiene el punto de la mira; la otra no.
    expect(card.matches('.product-card:has(.btn--added)')).toBe(true);
    expect(card.querySelector('.product-media .product-reticle-hit')).not.toBeNull();
    expect(other.matches('.product-card:has(.btn--added)')).toBe(false);
  });

  it('la hoja dibuja la mira al apuntar (puntero o teclado) y el impacto con «Añadido»', () => {
    expect(productMediaCss).toMatch(
      /@media \(hover: hover\)[\s\S]*?\.product-media:hover \.product-reticle-aim/
    );
    expect(productMediaCss).toMatch(/\.product-media:focus-visible \.product-reticle-aim/);
    expect(productMediaCss).toMatch(/\.detail-media:focus-visible \.product-reticle-aim/);
    expect(productMediaCss).toMatch(/\.product-card:has\(\.btn--added\) \.product-reticle-hit/);
    expect(productMediaCss).toMatch(/\.detail-grid:has\(\.btn--added\) \.product-reticle-hit/);
    // Cerrar → disparar → irse: la mira se cierra y desaparece y queda la pegatina.
    expect(productMediaCss).toMatch(
      /\.product-card:has\(\.btn--added\) \.product-reticle-aim,\s*\.detail-grid:has\(\.btn--added\) \.product-reticle-aim \{[^}]*opacity: 0;/
    );
    // En la ficha, la pegatina va abajo a la izquierda: arriba a la derecha la
    // pisan los pies del muñeco sentado en el marco.
    expect(productMediaCss).toMatch(
      /\.detail-media \.product-reticle-hit \{[^}]*left:[^}]*bottom:/
    );
    // En la ficha la mira tiene un tamaño acotado, no el de la foto entera.
    expect(productMediaCss).toMatch(/\.detail-media \.product-reticle \{[^}]*width: clamp\(/);
  });

  /* overflow: hidden de la tarjeta recortaba el anillo por fuera, y por dentro
     lo tapaban la mira, la lupa y el papel roto (I2, ronda 2 de código): el
     anillo es el último hijo pintado, un ::after encima de todo. */
  it('el anillo de foco de la foto se ve entero dentro de la tarjeta', () => {
    expect(productPageCss).toMatch(
      /\.product-card \.product-media:focus-visible \{\s*outline: none;/
    );
    expect(productPageCss).toMatch(
      /\.product-media:focus-visible::after \{[^}]*position: absolute;[^}]*inset: 3px;[^}]*border: 3px solid var\(--accent\);/
    );
  });

  /* Con movimiento reducido ni la mira ni el impacto se animan. Una anulación
     dentro de «reduce» pierde por especificidad frente a :has(.btn--added), así
     que las transiciones solo pueden declararse dentro de «no-preference». */
  it('las transiciones de la mira y del impacto solo existen sin movimiento reducido', () => {
    const reticle = productMediaCss.slice(productMediaCss.indexOf('La mira'));
    const motionBlock = /@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n {2}\}/g;
    const blocks = reticle.match(motionBlock) ?? [];
    const outside = reticle.replace(motionBlock, '');
    expect(outside).not.toMatch(/transition/);
    const motion = blocks.join('\n');
    expect(motion).toMatch(/\.product-reticle-aim \{\s*transition:/);
    expect(motion).toMatch(
      /\.product-card:has\(\.btn--added\) \.product-reticle-hit,\s*\.detail-grid:has\(\.btn--added\) \.product-reticle-hit \{\s*transition:[^}]*120ms/
    );
  });
});

describe('ProductPage: pegatina arrancada', () => {
  it('un agotado se ve medio arrancado y su foto sigue abriéndose entera', () => {
    renderCatalog([forSale, soldOut]);
    const card = cardOf('Marea');
    expect(card).toHaveClass('is-sold-out');
    const media = within(card).getByRole('button', { name: 'Ver Marea en grande' });
    const torn = media.querySelector('.torn-sticker');
    expect(torn).not.toBeNull();
    expect(torn).toHaveAttribute('aria-hidden', 'true');
    expect(within(card).getByRole('button', { name: 'Agotado' })).toBeDisabled();

    fireEvent.click(media);
    const zoom = document.querySelector('dialog img');
    expect(zoom).toHaveAttribute('src', '/products/rocky-marea-035.webp');
    expect(zoom.closest('dialog').querySelector('.torn-sticker')).toBeNull();
  });

  it('un disponible se ve entero', () => {
    renderCatalog([forSale, soldOut]);
    const card = cardOf('Airwave');
    expect(card).not.toHaveClass('is-sold-out');
    expect(card.querySelector('.torn-sticker')).toBeNull();
  });

  it('el rótulo «Agotado» no grita y cumple contraste AA; los desgarros alternan', () => {
    expect(productPageCss).toMatch(/\.torn-sticker-label \{[^}]*color: var\(--accent-dark\);/);
    // Más pequeño que el nombre del producto (I1, ronda 2 de código): el tope es
    // --text-base y el título usa --text-md, que es mayor.
    expect(productPageCss).toMatch(
      /\.torn-sticker-label \{[^}]*font-size: clamp\(0\.8rem, 6cqi, var\(--text-base\)\);/
    );
    expect(productPageCss).toMatch(/\.product-title \{[^}]*font-size: var\(--text-md\);/);
    const tokens = readFileSync('src/styles/00-tokens.css', 'utf8');
    const rem = (name) => Number(tokens.match(new RegExp(`--${name}: ([\\d.]+)rem`))[1]);
    expect(rem('text-base')).toBeLessThan(rem('text-md'));
    expect(productPageCss).toMatch(/\.product-card--flip \.torn-sticker-paper \{[^}]*scale: -1 1;/);
    expect(productPageCss).toMatch(/\.product-card--flip \.torn-sticker-label \{/);
    expect(productPageCss).toMatch(/\.product-card--flip\.is-sold-out \.product-zoom \{/);
    expect(productPageCss).not.toMatch(/nth-child\(even\)/);
  });

  /* Con 2 columnas, «par» ponía en espejo toda la columna derecha: la variante
     va por producto (tornVariant.js), igual para él siempre. */
  it('la variante del desgarro sale de cada producto', () => {
    const flipped = { ...soldOut, id: 'f', handle: 'rocky-signal-ghost', title: 'Ghost' };
    const plain = { ...soldOut, id: 'p', handle: 'rocky-marea-035', title: 'Marea' };
    renderCatalog([plain, flipped]);
    const isFlip = (title) => cardOf(title).classList.contains('product-card--flip');
    expect(isFlip('Ghost')).toBe(isTornFlipped('rocky-signal-ghost'));
    expect(isFlip('Marea')).toBe(isTornFlipped('rocky-marea-035'));
    expect(isFlip('Ghost')).not.toBe(isFlip('Marea'));
  });

  it('la tarjeta agotada no se levanta ni hace zoom al pasar el puntero', () => {
    expect(productPageCss).toMatch(/\.product-card:not\(:where\(\.is-sold-out\)\):hover \{/);
    expect(productPageCss).toMatch(
      /\.product-card:not\(:where\(\.is-sold-out\)\):hover \.product-image/
    );
    // Ninguna regla suelta levanta todas las tarjetas (las bajo llave tienen la suya).
    expect(productPageCss).not.toMatch(/^\s*\.product-card:hover \{/m);
  });
});

describe('ProductPage: drops en la portada y página de drop', () => {
  const now = () => Date.parse('2026-11-10T12:00:00Z');
  const live = {
    handle: 'rocky-drop-5',
    number: 5,
    title: 'ROCKY DROP 5',
    tagline: 'Recién salido',
    story: 'Cuando vuelan, vuelan.',
    poster: null,
    launchAt: '2026-11-01T19:00:00Z',
    endsAt: null,
    state: 'en-la-calle',
    designCount: 1,
    designs: ['rocky-airwave'],
    soldOut: false,
  };
  const announced = {
    ...live,
    handle: 'rocky-drop-6',
    number: 6,
    title: 'ROCKY DROP 6',
    launchAt: '2026-11-13T19:00:00Z',
    state: 'anunciado',
    designs: null,
  };
  const archive = {
    ...live,
    handle: 'rocky-drop-3',
    number: 3,
    title: 'ROCKY DROP 3',
    launchAt: '2026-09-01T19:00:00Z',
    endsAt: '2026-09-08T19:00:00Z',
    state: 'archivo',
    designs: ['rocky-congelado'],
  };
  const airwave = {
    ...forSale,
    drop: 'ROCKY DROP 5',
    dropHandle: 'rocky-drop-5',
    dropState: 'en-la-calle',
    purchasable: true,
  };
  const congelado = {
    ...forSale,
    id: 'rocky-congelado',
    handle: 'rocky-congelado',
    title: 'Congelado',
    drop: 'ROCKY DROP 3',
    dropHandle: 'rocky-drop-3',
    dropState: 'archivo',
    purchasable: false,
  };
  const drops = [announced, live, archive];

  function renderAt(path) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {['/', '/products/:category'].map((routePath) => (
            <Route
              key={routePath}
              path={routePath}
              element={
                <ProductPage
                  products={[airwave, congelado]}
                  addToCart={vi.fn()}
                  commerceMode="shopify"
                  canAddToCart
                  drops={drops}
                  featured={announced}
                  serverNow={now}
                />
              }
            />
          ))}
        </Routes>
      </MemoryRouter>
    );
  }

  it('la portada anuncia el drop destacado y lleva a su página', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /Ver el Drop 6/ })).toHaveAttribute(
      'href',
      '/products/rocky-drop-6'
    );
    expect(screen.getByText(/Cae el viernes 13 de noviembre a las 20:00/)).toBeInTheDocument();
  });

  it('el catálogo sigue el orden del muro: teaser, en la calle y archivo', () => {
    const { container } = renderAt('/');
    const order = [...container.querySelectorAll('.product-grid > *')].map(
      (node) => node.getAttribute('data-testid') || node.querySelector('h2')?.textContent
    );
    expect(order).toEqual([
      'catalogo-teaser-rocky-drop-6',
      'catalogo-seccion-rocky-drop-5',
      'Airwave',
      'catalogo-seccion-rocky-drop-3',
      'Congelado',
    ]);
  });

  it('un diseño del archivo no se puede comprar', () => {
    renderAt('/');
    const card = screen
      .getByRole('heading', { level: 2, name: 'Congelado' })
      .closest('.product-card');
    expect(within(card).getByRole('button', { name: 'Drop cerrado' })).toBeDisabled();
  });

  it('la página de un drop anunciado enseña su cartel con aviso y calendario, sin vaciarse', () => {
    renderAt('/products/rocky-drop-6');
    const cartel = screen.getByRole('article', { name: 'ROCKY DROP 6' });
    expect(cartel).toHaveClass('cartel--cabecera');
    expect(screen.getByRole('link', { name: 'Añadir al calendario' })).toHaveAttribute(
      'href',
      '/api/drops/rocky-drop-6/calendario.ics'
    );
    expect(screen.getByText(/se destapan el día del drop/i)).toBeInTheDocument();
    expect(screen.queryByText('Nada por aquí')).not.toBeInTheDocument();
  });

  it('la página de un drop en la calle lleva su cartel y sus diseños', () => {
    renderAt('/products/rocky-drop-5');
    expect(screen.getByRole('article', { name: 'ROCKY DROP 5' })).toHaveClass('cartel--cabecera');
    expect(screen.getByRole('heading', { level: 2, name: 'Airwave' })).toBeInTheDocument();
    expect(document.title).toContain('ROCKY DROP 5');
  });

  it('la página del archivo avisa de que el drop ya voló', () => {
    renderAt('/products/rocky-drop-3');
    expect(screen.getByText(/este drop ya voló/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Drop cerrado' })).toBeDisabled();
  });
});
