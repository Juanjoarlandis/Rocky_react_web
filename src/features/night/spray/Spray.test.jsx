import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { composeShareImage } from './shareImage.js';
import { traquetear } from './rattle.js';
import Spray from './Spray.jsx';

// La foto se compone en un canvas de verdad: aquí solo importa con qué trazos.
vi.mock('./shareImage.js', () => ({
  composeShareImage: vi.fn(async () => null),
  shareOrDownload: vi.fn(async () => 'downloaded'),
}));

// El traqueteo del bote suena de verdad: aquí solo importa cuándo se pide.
vi.mock('./rattle.js', () => ({ traquetear: vi.fn() }));

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

  describe('el lienzo solo existe cuando se pinta', () => {
    it('de noche, sin coger el bote y sin trazos, no hay lienzo', async () => {
      const fetchMock = servidor({ encendida: false });
      render(<Spray pathname="/crew" />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(screen.queryByTestId('spray-wall')).not.toBeInTheDocument();
    });

    it('con trazos propios guardados en el navegador sí lo hay', async () => {
      localStorage.setItem(
        'rocky-spray',
        JSON.stringify({
          v: 1,
          pages: { '/crew': { t: 1, strokes: [{ c: 0, s: 1, p: [0, 5], d: [] }] } },
        })
      );
      servidor({ encendida: false });
      render(<Spray pathname="/crew" />);
      expect(await screen.findByTestId('spray-wall')).toBeInTheDocument();
    });

    it('con trazos de la pared compartida sí lo hay, y se pintan', async () => {
      servidor();
      render(<Spray pathname="/crew" />);
      expect(await screen.findByTestId('spray-wall')).toBeInTheDocument();
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    it('al coger el bote aparece y al soltarlo sin nada pintado se libera', async () => {
      const fetchMock = servidor({ encendida: false });
      render(<Spray pathname="/crew" />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      await cogerSpray();
      expect(screen.getByTestId('spray-wall')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Soltar el spray' }));
      expect(screen.queryByTestId('spray-wall')).not.toBeInTheDocument();
    });

    it('con un trazo todavía subiendo a la pared común, soltar el bote no quita el lienzo', async () => {
      let responder;
      const fetchMock = vi.fn((url, options = {}) => {
        const metodo = options.method ?? 'GET';
        if (metodo === 'GET') return respuesta({ ...PARED, strokes: [], firmas: [] });
        return new Promise((resolve) => {
          responder = () =>
            resolve(
              new Response(JSON.stringify({ id: 'bbbbbbbbbbb', firma: 'LUNA-7', version: 2 }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
              })
            );
        });
      });
      vi.stubGlobal('fetch', fetchMock);
      render(<Spray pathname="/crew" />);
      await cogerSpray();
      await screen.findByText(/lo verá todo el que pase de noche/);
      pintar();
      await userEvent.click(screen.getByRole('button', { name: 'Soltar el spray' }));
      // Página sin trazos y bote soltado: lo único que hay es el trazo en vuelo
      expect(screen.getByTestId('spray-wall')).toBeInTheDocument();
      await act(async () => responder());
    });

    it('al soltar el bote con algo pintado el lienzo se queda', async () => {
      servidor({ encendida: false });
      render(<Spray pathname="/crew" />);
      await cogerSpray();
      await screen.findByText(/no se comparte/);
      pintar();
      await userEvent.click(screen.getByRole('button', { name: 'Soltar el spray' }));
      expect(screen.getByTestId('spray-wall')).toBeInTheDocument();
    });
  });

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

  it('los colores son tres botes con nombre; el elegido queda marcado y levantado', async () => {
    servidor();
    render(<Spray pathname="/crew" />);
    await cogerSpray();
    const botes = screen.getAllByRole('radio');
    expect(botes.map((bote) => bote.getAttribute('aria-label'))).toEqual([
      'Lima',
      'Violeta',
      'Blanco UV',
    ]);
    for (const bote of botes) expect(bote.querySelector('svg.spray-bote')).not.toBeNull();
    expect(botes[0]).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Violeta' }));
    expect(screen.getByRole('radio', { name: 'Violeta' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Violeta' })).toHaveClass('is-active');
    expect(screen.getByRole('radio', { name: 'Lima' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Lima' })).not.toHaveClass('is-active');
  });

  it('coger otro bote suena; volver a pulsar el mismo, no', async () => {
    servidor();
    vi.mocked(traquetear).mockClear();
    render(<Spray pathname="/crew" />);
    await cogerSpray();
    await userEvent.click(screen.getByRole('radio', { name: 'Lima' }));
    expect(traquetear).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('radio', { name: 'Violeta' }));
    expect(traquetear).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('radio', { name: 'Violeta' }));
    expect(traquetear).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('radio', { name: 'Blanco UV' }));
    expect(traquetear).toHaveBeenCalledTimes(2);
  });

  it('llevar el foco a una firma de la lista destaca lo suyo y al salir la pared vuelve entera', async () => {
    servidor();
    // Un contexto que apunta cuándo se atenúa el lienzo
    const atenuados = [];
    const espia = new Proxy(function espia() {}, {
      get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : espia),
      apply: () => espia,
      set: (_, key, value) => {
        if (key === 'globalCompositeOperation' && value === 'destination-out')
          atenuados.push(value);
        return true;
      },
    });
    HTMLCanvasElement.prototype.getContext.mockReturnValue(espia);
    render(<Spray pathname="/crew" />);
    await cogerSpray();
    await userEvent.click(await screen.findByText(/Firmas en esta pared/));
    const reportar = await screen.findByRole('button', { name: 'Reportar TELE-2' });
    const fila = reportar.closest('li');
    expect(atenuados).toHaveLength(0);
    expect(fila).not.toHaveClass('is-resaltada');

    fireEvent.focus(reportar);
    await waitFor(() => expect(fila).toHaveClass('is-resaltada'));
    expect(atenuados.length).toBeGreaterThanOrEqual(1);

    const antes = atenuados.length;
    fireEvent.blur(reportar);
    await waitFor(() => expect(fila).not.toHaveClass('is-resaltada'));
    // Al salir se repinta la pared entera, sin atenuar
    expect(atenuados).toHaveLength(antes);

    // Con el ratón, igual: al moverlo por la fila, no solo por tenerlo encima
    fireEvent.pointerMove(fila);
    await waitFor(() => expect(fila).toHaveClass('is-resaltada'));
    fireEvent.pointerLeave(fila);
    await waitFor(() => expect(fila).not.toHaveClass('is-resaltada'));
  });

  it('abrir la lista con el cursor quieto encima no atenúa la pared; el foco y el cursor van por separado', async () => {
    servidor();
    render(<Spray pathname="/crew" />);
    await cogerSpray();
    await userEvent.click(await screen.findByText(/Firmas en esta pared/));
    const reportar = await screen.findByRole('button', { name: 'Reportar TELE-2' });
    const fila = reportar.closest('li');
    // La fila aparece bajo el cursor sin que se haya movido: no destaca
    fireEvent.pointerEnter(fila);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(fila).not.toHaveClass('is-resaltada');
    // Con el cursor moviéndose por la fila, perder el foco no apaga el destacado
    fireEvent.focus(reportar);
    fireEvent.pointerMove(fila);
    await waitFor(() => expect(fila).toHaveClass('is-resaltada'));
    fireEvent.blur(reportar);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(fila).toHaveClass('is-resaltada');
    fireEvent.pointerLeave(fila);
    await waitFor(() => expect(fila).not.toHaveClass('is-resaltada'));
  });

  it('lo propio también se destaca al pasar el cursor por su fila', async () => {
    const fetchMock = servidor();
    render(<Spray pathname="/crew" />);
    await cogerSpray();
    await screen.findByText(/lo verá todo el que pase de noche/);
    pintar();
    await waitFor(() => expect(llamadas(fetchMock, 'POST', '/api/pared/trazos')).toHaveLength(1));
    await userEvent.click(screen.getByText(/Firmas en esta pared/));
    const mia = (await screen.findByText(/LUNA-7 \(tú\)/)).closest('li');
    // La fila propia no tiene nada que pulsar: no entra en el tabulador
    expect(mia.querySelectorAll('button, [tabindex]')).toHaveLength(0);
    fireEvent.pointerMove(mia);
    await waitFor(() => expect(mia).toHaveClass('is-resaltada'));
    fireEvent.pointerLeave(mia);
    await waitFor(() => expect(mia).not.toHaveClass('is-resaltada'));
  });

  it('si la firma destacada desaparece de la pared con el foco puesto, la pared vuelve a verse entera', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let conTele = true;
      const fetchMock = vi.fn((url, options = {}) => {
        if ((options.method ?? 'GET') === 'GET') {
          return respuesta(conTele ? PARED : { ...PARED, version: 2, strokes: [], firmas: [] });
        }
        return Promise.resolve(new Response(null, { status: 204 }));
      });
      vi.stubGlobal('fetch', fetchMock);
      const atenuados = [];
      let limpiezas = 0;
      const espia = new Proxy(function espia() {}, {
        get: (_, key) => {
          if (key === Symbol.toPrimitive) return () => 0;
          if (key === 'clearRect') return () => (limpiezas += 1);
          return espia;
        },
        apply: () => espia,
        set: (_, key, value) => {
          if (key === 'globalCompositeOperation' && value === 'destination-out') atenuados.push(1);
          return true;
        },
      });
      HTMLCanvasElement.prototype.getContext.mockReturnValue(espia);
      render(<Spray pathname="/crew" />);
      await cogerSpray();
      await userEvent.click(await screen.findByText(/Firmas en esta pared/));
      const reportar = await screen.findByRole('button', { name: 'Reportar TELE-2' });
      fireEvent.focus(reportar);
      await waitFor(() => expect(atenuados.length).toBeGreaterThanOrEqual(1));

      // La siguiente lectura ya no trae a TELE-2 (la crew lo ha borrado)
      conTele = false;
      const antes = { atenuados: atenuados.length, limpiezas };
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20_000);
      });
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Reportar TELE-2' })).toBeNull()
      );
      // Se ha repintado, y ya sin atenuar
      await waitFor(() => expect(limpiezas).toBeGreaterThan(antes.limpiezas));
      expect(atenuados).toHaveLength(antes.atenuados);
    } finally {
      vi.useRealTimers();
    }
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
