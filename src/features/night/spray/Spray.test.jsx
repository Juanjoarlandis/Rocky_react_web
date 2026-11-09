import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { composeShareImage } from './shareImage.js';
import Spray from './Spray.jsx';

// La foto se compone en un canvas de verdad: aquí solo importa con qué trazos.
vi.mock('./shareImage.js', () => ({
  composeShareImage: vi.fn(async () => null),
  shareOrDownload: vi.fn(async () => 'downloaded'),
}));

// Un contexto 2D que lo acepta todo: aquí importa qué se sube, no qué se pinta.
const nada = new Proxy(function nada() {}, {
  get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : nada),
  apply: () => nada,
  set: () => true,
});

function puntero(tipo, x, y) {
  const event = new MouseEvent(tipo, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  });
  Object.defineProperty(event, 'isPrimary', { value: true });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event;
}

function pintar() {
  fireEvent(document.body, puntero('pointerdown', 100, 100));
  fireEvent(window, puntero('pointermove', 140, 120));
  fireEvent(window, puntero('pointerup', 140, 120));
}

const respuesta = (body, status = 200) =>
  Promise.resolve(
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ETag: '"1-x"' },
    })
  );

const PARED = {
  enabled: true,
  version: 1,
  firma: null,
  strokes: [{ id: 'aaaaaaaaaaa', c: 0, s: 1, p: [0, 10], d: [], firma: 'TELE-2' }],
  firmas: [{ firma: 'TELE-2', mia: false }],
};

/* Un servidor de mentira: la pared encendida (o no) y lo que se pide. */
function servidor({ encendida = true, pintarFalla = false } = {}) {
  const fetchMock = vi.fn((url, options = {}) => {
    const metodo = options.method ?? 'GET';
    if (metodo === 'GET') return respuesta(encendida ? PARED : { enabled: false });
    if (url === '/api/pared/trazos' && metodo === 'POST') {
      return pintarFalla
        ? respuesta({ message: 'No', code: 'WALL_DAILY_LIMIT' }, 429)
        : respuesta({ id: 'bbbbbbbbbbb', firma: 'LUNA-7', version: 2 }, 201);
    }
    if (url.startsWith('/api/pared/reportes')) return respuesta({ oculta: false }, 202);
    return Promise.resolve(new Response(null, { status: 204 }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const llamadas = (fetchMock, metodo, trozo) =>
  fetchMock.mock.calls.filter(
    ([url, o = {}]) => (o.method ?? 'GET') === metodo && url.includes(trozo)
  );

describe('El spray con la pared compartida', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(nada);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('is-spraying');
  });

  async function cogerSpray() {
    await userEvent.click(screen.getByRole('button', { name: 'Coge el spray' }));
  }

  it('la primera vez avisa de que lo verá todo el que pase de noche', async () => {
    servidor();
    render(<Spray pathname="/crew" />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await cogerSpray();
    expect(await screen.findByText(/lo verá todo el que pase de noche/)).toBeInTheDocument();
  });

  it('con la pared apagada dice que no se comparte y guarda en el navegador', async () => {
    const fetchMock = servidor({ encendida: false });
    render(<Spray pathname="/crew" />);
    await cogerSpray();
    expect(await screen.findByText(/no se comparte/)).toBeInTheDocument();
    pintar();
    await waitFor(() => expect(localStorage.getItem('rocky-spray')).toContain('/crew'));
    expect(llamadas(fetchMock, 'POST', '/api/pared/trazos')).toHaveLength(0);
  });

  it('pintar con la pared encendida sube el trazo a la pared de su página y ancho', async () => {
    const fetchMock = servidor();
    render(<Spray pathname="/crew" />);
    await cogerSpray();
    await screen.findByText(/lo verá todo el que pase de noche/);
    pintar();
    await waitFor(() => expect(llamadas(fetchMock, 'POST', '/api/pared/trazos')).toHaveLength(1));
    const cuerpo = JSON.parse(llamadas(fetchMock, 'POST', '/api/pared/trazos')[0][1].body);
    expect(cuerpo.pagina).toBe('/crew');
    expect(['ancha', 'estrecha']).toContain(cuerpo.ancho);
    expect(cuerpo.trazo.p.length).toBeGreaterThanOrEqual(2);
    expect(cuerpo.trazo).not.toHaveProperty('firma');
    expect(localStorage.getItem('rocky-spray')).toBeNull();
  });

  it('si la subida falla, el trazo se queda en el navegador y lo dice', async () => {
    servidor({ pintarFalla: true });
    render(<Spray pathname="/crew" />);
    await cogerSpray();
    await screen.findByText(/lo verá todo el que pase de noche/);
    pintar();
    expect(await screen.findByText(/se queda en tu navegador/)).toBeInTheDocument();
    // Se guarda con el mismo retraso de siempre (300 ms)
    await waitFor(() => expect(localStorage.getItem('rocky-spray')).toContain('/crew'));
  });

  it('lo pintado antes en el navegador no se sube nunca', async () => {
    localStorage.setItem(
      'rocky-spray',
      JSON.stringify({
        v: 1,
        pages: { '/crew': { t: 1, strokes: [{ c: 0, s: 1, p: [0, 5], d: [] }] } },
      })
    );
    const fetchMock = servidor();
    render(<Spray pathname="/crew" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await cogerSpray();
    await screen.findByText(/lo verá todo el que pase de noche/);
    expect(llamadas(fetchMock, 'POST', '/api/pared/trazos')).toHaveLength(0);
  });

  it('deshacer quita en el servidor el último trazo propio; borrar, todo lo propio', async () => {
    const fetchMock = servidor();
    render(<Spray pathname="/crew" />);
    await cogerSpray();
    await screen.findByText(/lo verá todo el que pase de noche/);
    pintar();
    await waitFor(() => expect(llamadas(fetchMock, 'POST', '/api/pared/trazos')).toHaveLength(1));
    await userEvent.click(await screen.findByRole('button', { name: 'Deshacer' }));
    await waitFor(() =>
      expect(llamadas(fetchMock, 'DELETE', '/api/pared/trazos/bbbbbbbbbbb')).toHaveLength(1)
    );
    pintar();
    await waitFor(() => expect(llamadas(fetchMock, 'POST', '/api/pared/trazos')).toHaveLength(2));
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    await userEvent.click(screen.getByRole('button', { name: '¿Borrar todo?' }));
    await waitFor(() => expect(llamadas(fetchMock, 'DELETE', '/api/pared/mios')).toHaveLength(1));
  });

  it('la lista de firmas deja reportar con el teclado y marca la propia', async () => {
    const fetchMock = servidor();
    render(<Spray pathname="/crew" />);
    await cogerSpray();
    await screen.findByText(/lo verá todo el que pase de noche/);
    pintar();
    await waitFor(() => expect(llamadas(fetchMock, 'POST', '/api/pared/trazos')).toHaveLength(1));
    await userEvent.click(screen.getByText(/Firmas en esta pared/));
    expect(await screen.findByText(/LUNA-7 \(tú\)/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reportar LUNA-7' })).not.toBeInTheDocument();
    const reportar = screen.getByRole('button', { name: 'Reportar TELE-2' });
    reportar.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(llamadas(fetchMock, 'POST', '/api/pared/reportes')).toHaveLength(1));
    expect(JSON.parse(llamadas(fetchMock, 'POST', '/api/pared/reportes')[0][1].body).firma).toBe(
      'TELE-2'
    );
    expect(await screen.findByText(/Gracias/)).toBeInTheDocument();
  });

  it('la foto se puede hacer con lo pintado en la pared común y solo lleva lo propio', async () => {
    const fetchMock = servidor();
    const user = userEvent.setup();
    render(<Spray pathname="/crew" />);
    await user.click(screen.getByRole('button', { name: 'Coge el spray' }));
    pintar();
    await waitFor(() => expect(llamadas(fetchMock, 'POST', '/api/pared/trazos')).toHaveLength(1));
    const foto = screen.getByRole('button', { name: 'Foto' });
    await waitFor(() => expect(foto).toBeEnabled());
    await user.click(foto);
    await waitFor(() => expect(composeShareImage).toHaveBeenCalled());
    const firmas = composeShareImage.mock.calls.at(-1)[0].map((stroke) => stroke.firma);
    expect(firmas).toEqual(['LUNA-7']);
  });
});
