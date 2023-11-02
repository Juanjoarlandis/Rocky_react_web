import { Link } from 'react-router-dom';
import '../styles/MenuDrop.css';  // Importa el archivo CSS
import tumbado from "../images/tumbado.png"

function MenuDrop({ products, onCategoryChange }) {
    const uniqueDrops = [...new Set(products.map(product => product.drop))];

    return (
        <div className="menu-drop-container">
            <img src={tumbado} alt="Hombre tumbado" className="man-tumbado" />
            <Link className="menu-drop-link" to="/" onClick={() => onCategoryChange("all")}>Todas las categorías</Link>
            {uniqueDrops.map(drop => (
                <div key={drop}>
                    <Link className="menu-drop-link" to={`/products/${drop}`} onClick={() => onCategoryChange(drop)}>{drop}</Link>
                </div>
            ))}
        </div>
    );
}

export default MenuDrop;
