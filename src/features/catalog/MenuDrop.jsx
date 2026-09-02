import { Link } from 'react-router';
import tumbado from '../../images/optimized/shell/tumbado-800.webp';
import skaterOllie from '../../images/optimized/characters/skater-ollie-600.webp';
import dadoSentado from '../../images/optimized/characters/dado-sentado-600.webp';
import { PLACEHOLDER_IMAGE } from '../../config/commerce.js';
import { formatPrice } from '../../utils/price';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import '../../styles/pages/drops.css';

/* Cada drop se cuenta por lo que tiene: diseños con precio (disponible),
   bajo llave (sin revelar) o conceptos de vista previa. */
export function summarizeDrops(products) {
  const drops = new Map();
  products.forEach((product) => {
    const handle = product.dropHandle || product.drop;
    if (!handle) return;
    if (!drops.has(handle)) {
      drops.set(handle, {
        handle,
        title: product.drop,
        total: 0,
        locked: 0,
        previews: 0,
        available: 0,
      });
    }
    const drop = drops.get(handle);
    drop.total += 1;
    if (product.isPreview) drop.previews += 1;
    else if (product.image === PLACEHOLDER_IMAGE) drop.locked += 1;
    else if (formatPrice(product.price)) drop.available += 1;
  });
  return [...drops.values()].map((drop) => ({ ...drop, state: dropState(drop) }));
}

function dropState(drop) {
  if (drop.available > 0) return 'Disponible';
  if (drop.previews === drop.total) return 'Concepto';
  if (drop.locked > 0) return 'Sin revelar';
  return 'Próximamente';
}

function dropMeta(drop) {
  const parts = [`${drop.total} ${drop.total === 1 ? 'diseño' : 'diseños'}`];
  if (drop.locked > 0 && drop.locked < drop.total) parts.push(`${drop.locked} bajo llave`);
  return parts.join(' · ');
}

function MenuDrop({ products }) {
  useDocumentTitle('Drops');
  const drops = summarizeDrops(products);

  return (
    <div className="page-container drops">
      <h1 className="page-title">Drops</h1>
      <p className="subtitle">Colecciones limitadas. Cuando vuelan, vuelan.</p>
      <div className="doodle-shelf drops-list-wrap">
        {/* El tumbado descansa sobre la primera tarjeta de la lista */}
        <img
          src={tumbado}
          width="800"
          height="500"
          alt=""
          className="doodle drops-illustration neon-art al-ritmo al-ritmo--suave"
          style={{ '--fase': '0.35' }}
        />
        {/* El Dado se juega el próximo drop en la otra punta de la repisa */}
        <img
          src={dadoSentado}
          width="600"
          height="600"
          alt=""
          className="doodle drops-dado neon-art al-ritmo"
          style={{ '--fase': '0.55' }}
        />
        {/* Y el skater vuela por encima */}
        <img
          src={skaterOllie}
          width="600"
          height="600"
          alt=""
          className="doodle drops-skater neon-art al-ritmo"
          style={{ '--fase': '1.1' }}
        />
        <nav className="drops-list" aria-label="Categorías">
          <Link className="paper-card lift drops-link" to="/">
            <span className="drops-link-copy">
              <span className="drops-link-title">Todo el catálogo</span>
              <span className="kicker drops-link-meta">{products.length} diseños</span>
            </span>
            <span className="drops-arrow" aria-hidden="true">
              →
            </span>
          </Link>
          {drops.map((drop) => (
            <Link
              key={drop.handle}
              className="paper-card lift drops-link"
              to={`/products/${encodeURIComponent(drop.handle)}`}
            >
              <span className="drops-link-copy">
                <span className="drops-link-title">{drop.title}</span>
                <span className="drops-link-meta-row">
                  <span className="kicker drops-link-meta">{dropMeta(drop)}</span>
                  <span
                    className={`sticker drops-link-state drops-link-state--${drop.state === 'Disponible' ? 'available' : 'pending'}`}
                  >
                    {drop.state}
                  </span>
                </span>
              </span>
              <span className="drops-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default MenuDrop;
