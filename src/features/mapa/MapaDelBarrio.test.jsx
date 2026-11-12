import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import CabezaMuneco from '../../components/CabezaMuneco.jsx';
import { VOCES } from '../../data/voces.js';
import MapaDelBarrio from './MapaDelBarrio.jsx';

/* Lacoma en un mapa (barrio-en-mapa): navegación de verdad sobre el plano real del barrio,
   que es decorativo. */
const pintar = (props = {}) =>
  render(
    <MemoryRouter>
      <MapaDelBarrio {...props} />
    </MemoryRouter>
  );

const mapa = () => screen.getByRole('navigation', { name: 'El mapa de Lacoma' });

describe('MapaDelBarrio', () => {
  it('es una navegación «El mapa de Lacoma» con los cuatro sitios del barrio', () => {
    pintar();
    const enlaces = within(mapa()).getAllByRole('link');

    expect(enlaces.map((enlace) => enlace.getAttribute('href'))).toEqual([
      '/',
      '/rockyIA',
      '/menudrop',
      '/cart',
    ]);
  });

  // El nombre que anuncia un lector de pantalla: el número del punto no se lee.
  it('cada sitio se llama por su nombre, la sección que abre y quién vive allí', () => {
    pintar();

    for (const nombre of [
      'Los bancos de La Salle La Tienda · Los Fundadores, El Spray y 7 más',
      'Bar Mundus Rocky IA · El Portero y El Estrella',
      'El callejón Los Drops · El Tumbao, El Ollie y El Dado',
      'El kebab El carrito · El Curioso, El Dormilón y 2 más',
    ]) {
      expect(within(mapa()).getByRole('link', { name: nombre })).toBeInTheDocument();
    }
  });

  it('se llama Lacoma, el barrio de la marca', () => {
    pintar();

    expect(screen.getByRole('heading', { name: 'Lacoma' })).toBeInTheDocument();
    expect(screen.getByText('Dónde vive cada uno de la crew en Lacoma.')).toBeInTheDocument();
  });

  it('el dibujo es decorativo y no carga nada de fuera', () => {
    const { container } = pintar();
    const dibujo = container.querySelector('svg.mapa-dibujo');

    expect(dibujo).toHaveAttribute('aria-hidden', 'true');
    expect(dibujo.querySelector('image, use, foreignObject')).toBeNull();
    expect(dibujo.outerHTML).not.toMatch(/https?:|data:/);
    expect(dibujo.querySelector('.mapa-ancha')).toHaveAttribute('d');
    expect(dibujo.querySelector('.mapa-parque')).toHaveAttribute('d');
    expect(dibujo.querySelector('.mapa-metro')).toHaveTextContent('MLacoma');
  });

  it('cada sitio lleva la cabeza de su vecino', () => {
    pintar();
    const cabezaDe = (nombre) => {
      const { container } = render(<CabezaMuneco voz={VOCES[nombre]} tamano={44} />);
      return container.querySelector('img').getAttribute('src');
    };

    for (const [sitio, vecino] of [
      ['Los bancos de La Salle', 'Los Fundadores'],
      ['Bar Mundus', 'El Portero'],
      ['El callejón', 'El Ollie'],
      ['El kebab', 'El Paquetes'],
    ]) {
      const enlace = within(mapa()).getByRole('link', { name: new RegExp(sitio) });
      expect(enlace.querySelector('.cabeza-muneco img').getAttribute('src')).toBe(cabezaDe(vecino));
    }
  });

  it('cada sitio lleva su número en el dibujo y en su tarjeta', () => {
    const { container } = pintar();

    expect(
      [...container.querySelectorAll('svg .mapa-punto text')].map((n) => n.textContent)
    ).toEqual(['1', '2', '3', '4']);
    expect(
      within(mapa())
        .getAllByRole('link')
        .map((enlace) => enlace.querySelector('.mapa-num').textContent)
    ).toEqual(['1', '2', '3', '4']);
  });

  it('cita a OpenStreetMap bajo el dibujo, con su enlace', () => {
    const { container } = pintar();

    expect(container.querySelector('.mapa-credito')).toHaveTextContent(
      '© colaboradores de OpenStreetMap'
    );
    expect(screen.getByRole('link', { name: 'colaboradores de OpenStreetMap' })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright'
    );
  });

  // El 404 y el diálogo del pie pueden coincidir en la misma página.
  it('dos mapas a la vez no comparten el recorte de la hoja', () => {
    const { container } = render(
      <MemoryRouter>
        <MapaDelBarrio />
        <MapaDelBarrio />
      </MemoryRouter>
    );
    const ids = [...container.querySelectorAll('clipPath')].map((clip) => clip.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('con «tú estás aquí» dice que estás fuera del mapa, con los del 404', () => {
    const { container } = pintar({ tuEstasAqui: true });

    expect(
      screen.getByText(/fuera del mapa, con El Turista y Rocky, que viven en el 404/)
    ).toBeInTheDocument();
    expect(container.querySelector('.mapa-chincheta')).not.toBeNull();
  });

  it('sin «tú estás aquí» no hay nota ni chincheta', () => {
    const { container } = pintar();

    expect(container.querySelector('.mapa-fuera')).toBeNull();
    expect(container.querySelector('.mapa-chincheta')).toBeNull();
  });

  it('avisa al ir a un sitio, para que el diálogo se cierre', () => {
    const onIr = vi.fn();
    pintar({ onIr });

    screen.getByRole('link', { name: /El callejón/ }).click();

    expect(onIr).toHaveBeenCalledTimes(1);
  });

  // Con Ctrl o ⌘ el navegador abre el sitio en otra pestaña: el diálogo se queda.
  it('con una tecla de abrir aparte no avisa', () => {
    const onIr = vi.fn();
    pintar({ onIr });
    const enlace = screen.getByRole('link', { name: /El callejón/ });
    // jsdom no abre pestañas: se corta la acción por defecto antes de que llegue.
    const sinAbrir = (event) => event.preventDefault();
    document.addEventListener('click', sinAbrir);

    try {
      fireEvent.click(enlace, { ctrlKey: true });
      fireEvent.click(enlace, { metaKey: true });
    } finally {
      document.removeEventListener('click', sinAbrir);
    }

    expect(onIr).not.toHaveBeenCalled();
  });
});
