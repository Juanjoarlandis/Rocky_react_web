import React from 'react';
import notFoundImage from '../images/notfound.png'; // Asegúrate de proporcionar la ruta correcta a tu imagen
import '../styles/NotFound.css';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="notfound-container">
            <img src={notFoundImage} alt="Not Found" className="notfound-image" />
            <p className="notfound-text">Lo sentimos, la página que estás buscando no existe.</p>
            <div className="back-button-container">
                <Link to="/">
                    <button className="back-button">Volver al inicio</button>
                </Link>
            </div>
        </div>
    );
}

export default NotFound;
