import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import Muro from './Muro';

const serverNow = () => Date.parse('2026-11-10T12:00:00Z');

const drop = (handle, number, state, launchAt, endsAt = null) => ({
  handle,
  number,
  title: `ROCKY DROP ${number}`,
  tagline: '',
  story: '',
  poster: null,
  launchAt,
  endsAt,
  state,
  designCount: 2,
  designs: state === 'anunciado' ? null : [],
  soldOut: false,
});

const DROPS = [
  drop('rocky-drop-6', 6, 'anunciado', '2026-11-13T19:00:00Z'),
  drop('rocky-drop-5', 5, 'en-la-calle', '2026-11-01T19:00:00Z'),
  drop('rocky-drop-4', 4, 'ultimas-horas', '2026-10-01T19:00:00Z', '2026-11-11T19:00:00Z'),
  drop('rocky-drop-3', 3, 'archivo', '2026-09-01T19:00:00Z', '2026-09-08T19:00:00Z'),
  drop('rocky-drop-2', 2, 'archivo', '2026-08-01T19:00:00Z', '2026-08-08T19:00:00Z'),
];

function renderMuro(props = {}) {
  return render(
    <MemoryRouter>
      <Muro drops={DROPS} featured={DROPS[0]} products={[]} serverNow={serverNow} {...props} />
    </MemoryRouter>
  );
}

describe('El muro', () => {
  it('pega un cartel por drop en el orden que le da el servidor', () => {
    renderMuro();
    expect(screen.getByRole('heading', { level: 1, name: 'El muro' })).toBeInTheDocument();
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('data-testid'))).toEqual([
      'cartel-rocky-drop-6',
      'cartel-rocky-drop-5',
      'cartel-rocky-drop-4',
      'cartel-rocky-drop-3',
      'cartel-rocky-drop-2',
    ]);
  });

  it('el archivo queda por detrás, solapado bajo los más nuevos', () => {
    const { container } = renderMuro();
    const huecos = [...container.querySelectorAll('.muro-hueco')];
    expect(huecos.filter((h) => h.classList.contains('muro-hueco--archivo'))).toHaveLength(2);
    const capas = huecos.map((h) => Number(h.style.getPropertyValue('--capa')));
    expect(capas).toEqual([...capas].sort((a, b) => b - a));
  });

  it('El Pegador empapela junto al cartel destacado y es decorativo', () => {
    const { container } = renderMuro();
    const pegador = container.querySelector('.muro-pegador');
    expect(pegador).not.toBeNull();
    expect(pegador).toHaveAttribute('alt', '');
    expect(pegador).toHaveClass('neon-art');
    expect(
      pegador.closest('.muro-hueco').querySelector('[data-testid="cartel-rocky-drop-6"]')
    ).not.toBeNull();
  });

  it('sin drops lo dice y no se queda en blanco', () => {
    renderMuro({ drops: [], featured: null });
    expect(screen.getByText(/todavía no hay nada pegado/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('si no ha podido leer los drops lo dice, en vez de dar el muro por vacío', () => {
    renderMuro({ drops: [], featured: null, error: 'Sin conexión.' });
    expect(screen.getByRole('alert')).toHaveTextContent('No hemos podido leer el muro');
    expect(screen.queryByText(/Todavía no hay nada pegado/)).not.toBeInTheDocument();
  });

  it('mientras carga enseña el aviso de carga', () => {
    renderMuro({ drops: [], featured: null, loading: true });
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('lleva al catálogo completo', () => {
    renderMuro();
    expect(screen.getByRole('link', { name: /todo el catálogo/i })).toHaveAttribute('href', '/');
  });
});
