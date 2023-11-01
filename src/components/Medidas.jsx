import React from 'react'
import { Link } from 'react-router-dom'

function Medidas() {
    return (

        <div className="back-button-container">
            <Link to="/">
                <button className="back-button">Volver a inicio</button>
            </Link>
            <div>AQUI VAN LA INFORMACIÓN SOBRE TALLAJE Y ESAS COSAS</div>
        </div>
    )
}

export default Medidas