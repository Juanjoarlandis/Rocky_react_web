import { Link } from 'react-router';
import perdidoMapa from '../images/optimized/characters/perdido-mapa-600.webp';
import perroRocky from '../images/optimized/characters/perro-rocky-600.webp';
import '../styles/pages/not-found.css';

const NotFound = () => {
  return (
    <div className="page-container notfound">
      <div className="notfound-figures">
        <img
          src={perdidoMapa}
          width="614"
          height="1360"
          decoding="async"
          alt="Personaje ROCKY perdido, consultando un mapa"
          className="notfound-image neon-art al-ritmo"
          style={{ '--fase': '0.25' }}
        />
        {/* El perro de la banda, que sí sabe volver */}
        <img
          src={perroRocky}
          alt=""
          className="notfound-dog neon-art al-ritmo"
          style={{ '--fase': '0.75' }}
        />
      </div>
      <h1 className="notfound-title">Te has salido del mapa</h1>
      <p className="notfound-text">La página que buscas no existe.</p>
      <Link to="/" className="btn btn--primary">
        Volver a la tienda
      </Link>
    </div>
  );
};

export default NotFound;
