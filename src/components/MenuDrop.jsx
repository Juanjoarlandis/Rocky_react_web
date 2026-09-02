import React from 'react';
import { Link } from 'react-router';
import tumbado from '../images/optimized/shell/tumbado-800.webp';
import skaterOllie from '../images/optimized/characters/skater-ollie-600.webp';
import dadoSentado from '../images/optimized/characters/dado-sentado-600.webp';
import '../styles/MenuDrop.css';

function MenuDrop({ products }) {
    const uniqueDrops = [...products.reduce((drops, product) => {
        const handle = product.dropHandle || product.drop;
        if (handle && !drops.has(handle)) {
            drops.set(handle, { handle, title: product.drop });
        }
        return drops;
    }, new Map()).values()];

    return (
        <div className="drops">
            <h1 className="page-title">Drops</h1>
            <p className="drops-subtitle">Colecciones limitadas. Cuando vuelan, vuelan.</p>
            <div className="drops-list-wrap">
                {/* El tumbado descansa sobre la primera tarjeta de la lista */}
                <img src={tumbado} alt="" className="drops-illustration neon-art al-ritmo al-ritmo--suave" style={{ '--fase': '0.35' }} />
                {/* El Dado se juega el próximo drop en la otra punta de la repisa */}
                <img src={dadoSentado} alt="" className="drops-dado neon-art al-ritmo" style={{ '--fase': '0.55' }} />
                {/* Y el skater vuela por encima */}
                <img src={skaterOllie} alt="" className="drops-skater neon-art al-ritmo" style={{ '--fase': '1.1' }} />
                <nav className="drops-list" aria-label="Categorías">
                    <Link className="drops-link" to="/">
                        <span>Todo el catálogo</span>
                        <span className="drops-arrow" aria-hidden="true">→</span>
                    </Link>
                    {uniqueDrops.map((drop) => (
                        <Link
                            key={drop.handle}
                            className="drops-link"
                            to={`/products/${encodeURIComponent(drop.handle)}`}
                        >
                            <span>{drop.title}</span>
                            <span className="drops-arrow" aria-hidden="true">→</span>
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    );
}

export default MenuDrop;
