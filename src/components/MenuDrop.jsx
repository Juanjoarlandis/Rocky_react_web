import { Link } from 'react-router-dom';
import '../styles/MenuDrop.css';  // Importa el archivo CSS

function MenuDrop({ products, onCategoryChange }) {
    const uniqueDrops = [...new Set(products.map(product => product.drop))];

    return (
        <div className="menu-drop-container">
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
