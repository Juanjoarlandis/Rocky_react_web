import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VOCES } from '../data/voces.js';
import CabezaMuneco from './CabezaMuneco.jsx';

/* La cabeza recortada de un muñeco (voz-de-la-crew, barrio-en-mapa): la usan la
   firma de la ficha y el mapa del barrio. */
describe('CabezaMuneco', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it('recorta hacia el foco de su voz y es decorativa', () => {
    const { container } = render(<CabezaMuneco voz={VOCES['El Paquetes']} tamano={44} />);
    const cabeza = container.querySelector('.cabeza-muneco');

    expect(cabeza.style.getPropertyValue('--foco')).toBe('10% 16%');
    expect(cabeza.style.getPropertyValue('--tamano')).toBe('44px');
    expect(cabeza).toHaveAttribute('aria-hidden', 'true');
    expect(cabeza.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('Los Fundadores van sobre fondo oscuro', () => {
    const { container } = render(<CabezaMuneco voz={VOCES['Los Fundadores']} />);

    expect(container.querySelector('.cabeza-muneco')).toHaveClass('cabeza-muneco--oscura');
  });

  it('suma la clase de quien la usa, con su variante oscura', () => {
    const { container } = render(
      <CabezaMuneco voz={VOCES['Los Fundadores']} clase="detail-firma-cabeza" />
    );
    const cabeza = container.querySelector('.cabeza-muneco');

    expect(cabeza).toHaveClass('detail-firma-cabeza', 'detail-firma-cabeza--oscura');
  });

  it('de noche pinta el dibujo de noche', () => {
    document.documentElement.dataset.theme = 'neon';
    const { container } = render(<CabezaMuneco voz={VOCES['El Lata']} />);

    expect(container.querySelector('img').getAttribute('src')).toMatch(/toxico/);
  });
});
