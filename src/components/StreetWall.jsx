import React from 'react';
import { Link } from 'react-router';
import streetWall from '../data/streetWall';
import fotografoAgachado from '../images/characters/fotografo-agachado.png';
import '../styles/StreetWall.css';

// Muro de fotos tipo pared de habitación: polaroids pegadas con celo,
// en blanco y negro, con pies de foto en rotulador.
function StreetWall() {
    if (!streetWall.length) return null;

    return (
        <section className="street-wall">
            <div className="street-wall-head">
                <h2 className="page-title">La banda</h2>
                <a
                    className="street-wall-handle"
                    href="https://www.instagram.com/rocky035/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    del insta @rocky035
                </a>
                {/* El fotógrafo de la crew, disparando el muro */}
                <span className="street-photographer">
                    <img src={fotografoAgachado} alt="" />
                </span>
            </div>
            <div className="street-wall-grid">
                {streetWall.map((photo) => (
                    <figure key={photo.src} className="street-photo">
                        <img src={photo.src} alt={photo.alt} loading="lazy" />
                        <figcaption>{photo.caption}</figcaption>
                    </figure>
                ))}
            </div>
            <div className="street-wall-cta">
                <Link to="/crew" className="btn btn-primary">
                    Conoce a la crew →
                </Link>
            </div>
        </section>
    );
}

export default StreetWall;
