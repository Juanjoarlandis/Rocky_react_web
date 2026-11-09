import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import BeatMachine from './BeatMachine.jsx';
import { MusicProvider } from '../music/MusicContext.jsx';
import { CORTES_BARRO, PAD_TECLAS, TRACKS } from '../../data/mesa';
import { FakeAudioContext } from '../../audio/fakeAudioContext.js';
import { BARRO_URL, olvidarBarro } from './audio/barro.js';
import { STEP_COUNT } from '../../utils/beatCodec';

// Cada pista es un fieldset con su nombre por leyenda; las celdas, botones «X, paso N».
const filas = () =>
  screen.getAllByRole('group', { name: (_name, element) => element.tagName === 'FIELDSET' });

// En jsdom no hay Web Audio: la mesa se dibuja y se edita igual, sin sonar.
function montar(ruta = '/estudio') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <MusicProvider>
        <BeatMachine />
      </MusicProvider>
    </MemoryRouter>
  );
}

describe('La mesa de beats', () => {
  it('preserves Space activation for mute, solo and sequencer cells', async () => {
    const user = userEvent.setup();
    montar();
    for (const label of ['Bombo', 'Solo de Bombo', 'Palmas, paso 1']) {
      const button = screen.getByRole('button', { name: label });
      button.focus();
      await user.keyboard(' ');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    }
  });

  it('does not capture pad shortcuts outside the table or inside a dialog', () => {
    montar();
    const outside = new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true });
    fireEvent(document.body, outside);
    expect(outside.defaultPrevented).toBe(false);
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    document.querySelector('.mesa-wrap').appendChild(modal);
    const inside = new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true });
    fireEvent(modal, inside);
    expect(inside.defaultPrevented).toBe(false);
  });

  it('keeps pad shortcuts available while a pad has focus', () => {
    montar();
    const pad = screen.getByRole('button', { name: 'Pad 1: Bombo' });
    pad.focus();
    const shortcut = new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true });
    fireEvent(pad, shortcut);
    expect(shortcut.defaultPrevented).toBe(true);
  });
  beforeEach(() => {
    localStorage.clear();
  });

  it('dibuja las ocho pistas con sus dieciséis pasos', () => {
    montar();
    const pistas = filas();
    expect(pistas).toHaveLength(TRACKS.length);
    expect(within(pistas[0]).getAllByRole('button', { name: /, paso \d+$/ })).toHaveLength(
      STEP_COUNT
    );
  });

  it('arranca con el ritmo de fábrica cargado', () => {
    montar();
    const bombo = within(filas()[0]).getAllByRole('button', { name: /, paso \d+$/ });
    expect(bombo[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('abre el beat que venga en el enlace', () => {
    // Sólo el último paso del bombo encendido (código antiguo de 4 pistas)
    montar('/estudio?beat=8000000000000000&bpm=120');
    const bombo = within(filas()[0]).getAllByRole('button', { name: /, paso \d+$/ });
    expect(bombo[0]).toHaveAttribute('aria-pressed', 'false');
    expect(bombo[15]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Tempo en pulsos por minuto')).toHaveValue('120');
  });

  it('al pinchar una celda va rotando golpe, acento y fantasma', async () => {
    const user = userEvent.setup();
    montar();
    const palmas = within(filas()[4]).getAllByRole('button', { name: /, paso \d+$/ });
    expect(palmas[0].className).not.toMatch(/v[123]/);
    await user.click(palmas[0]);
    expect(palmas[0].className).toMatch(/v2/);
    await user.click(palmas[0]);
    expect(palmas[0].className).toMatch(/v3/);
    await user.click(palmas[0]);
    expect(palmas[0].className).toMatch(/v1/);
    await user.click(palmas[0]);
    expect(palmas[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('carga los ritmos de fábrica con su tempo', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'Trap' }));
    expect(screen.getByLabelText('Tempo en pulsos por minuto')).toHaveValue('140');
    const caja = within(filas()[1]).getAllByRole('button', { name: /, paso \d+$/ });
    expect(caja[8]).toHaveAttribute('aria-pressed', 'true');
  });

  it('limpia la rejilla entera', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'Limpiar' }));
    screen.getAllByRole('button', { name: /, paso \d+$/ }).forEach((celda) => {
      expect(celda).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('silencia y pone en solo cada pista', async () => {
    const user = userEvent.setup();
    montar();
    const cabeza = filas()[0];
    const nombre = within(cabeza).getByRole('button', { name: 'Bombo' });
    await user.click(nombre);
    expect(nombre).toHaveAttribute('aria-pressed', 'true');
    const solo = within(cabeza).getByRole('button', { name: 'Solo de Bombo' });
    await user.click(solo);
    expect(solo).toHaveAttribute('aria-pressed', 'true');
  });

  it('cambia de banco de pads y afina las teclas con la tonalidad', async () => {
    const user = userEvent.setup();
    montar();
    expect(screen.getByRole('button', { name: 'Pad 1: Bombo' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Teclas' }));
    expect(screen.getByRole('button', { name: 'Pad 1: Do3' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Tono'), 'fa');
    expect(screen.getByRole('button', { name: 'Pad 1: Fa3' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Efectos' }));
    expect(screen.getByRole('button', { name: 'Pad 3: Impacto' })).toBeInTheDocument();
  });

  it('reparte una tecla del ordenador a cada pad', () => {
    montar();
    const pads = screen.getAllByRole('button', { name: /^Pad \d+:/ });
    expect(pads).toHaveLength(PAD_TECLAS.length);
    pads.forEach((pad, i) => {
      expect(pad).toHaveTextContent(PAD_TECLAS[i].toUpperCase());
    });
  });

  it('comparte un enlace con el beat, el tempo y el swing', async () => {
    const user = userEvent.setup();
    const escrito = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (texto) => {
          escrito.push(texto);
          return Promise.resolve();
        },
      },
    });

    montar();
    await user.click(screen.getByRole('button', { name: 'Compartir beat' }));
    expect(escrito[0]).toMatch(/\/estudio\?beat=2[0-9a-f]{64}&bpm=\d+&swing=[\d.]+&tono=\w+$/);
    expect(await screen.findByRole('button', { name: '¡Copiado!' })).toBeInTheDocument();
  });

  it('guarda el beat en el navegador para la próxima visita', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'House' }));
    const guardado = JSON.parse(localStorage.getItem('rocky-mesa-beats'));
    expect(guardado.bpm).toBe(124);
    expect(guardado.code).toMatch(/^2[0-9a-f]{64}$/);
  });
});

describe('El banco BARRO', () => {
  // Un AudioContext falso que «decodifica» 120 s de silencio estéreo.
  class ContextoConBarro extends FakeAudioContext {
    async decodeAudioData() {
      return this.createBuffer(2, 120 * this.sampleRate, this.sampleRate);
    }
  }
  const audioDeBarro = () =>
    Promise.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });

  beforeEach(() => {
    localStorage.clear();
    olvidarBarro();
    vi.stubGlobal('AudioContext', ContextoConBarro);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const pidioBarro = (fetchMock) => fetchMock.mock.calls.some(([url]) => url === BARRO_URL);

  it('sin elegir el banco no se descarga BARRO', async () => {
    const fetchMock = vi.fn(audioDeBarro);
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'Teclas' }));
    await user.click(screen.getByRole('button', { name: 'Pad 1: Do3' }));
    expect(pidioBarro(fetchMock)).toBe(false);
  });

  it('al elegirlo dice que carga y después toca los cortes', async () => {
    let soltar;
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          soltar = () => resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'BARRO' }));
    expect(screen.getByText(/Cargando BARRO/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Pads de sonido' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    soltar();
    const primero = await screen.findByRole('button', {
      name: `Pad 1: ${CORTES_BARRO[0].label}`,
    });
    expect(screen.queryByText(/Cargando BARRO/)).not.toBeInTheDocument();
    await user.click(primero);
    expect(pidioBarro(fetchMock)).toBe(true);
  });

  it('si BARRO no llega lo dice, deja reintentar y la batería sigue', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementation(audioDeBarro);
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'BARRO' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se ha podido descargar BARRO/);
    await user.click(screen.getByRole('button', { name: 'Batería' }));
    expect(screen.getByRole('button', { name: 'Pad 1: Bombo' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'BARRO' }));
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('button', { name: `Pad 1: ${CORTES_BARRO[0].label}` })
    ).toBeInTheDocument();
  });

  it('con BARRO el tono no se usa y REC avisa de que los cortes no se graban', async () => {
    vi.stubGlobal('fetch', vi.fn(audioDeBarro));
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'BARRO' }));
    await screen.findByRole('button', { name: `Pad 1: ${CORTES_BARRO[0].label}` });
    expect(screen.getByLabelText('Tono')).toBeDisabled();
    expect(screen.queryByText(/no se graban en la rejilla/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /REC/ }));
    expect(screen.getByText(/no se graban en la rejilla/)).toBeInTheDocument();
  });

  it('también carga en modo estricto de React (como en desarrollo)', async () => {
    vi.stubGlobal('fetch', vi.fn(audioDeBarro));
    const user = userEvent.setup();
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/estudio']}>
          <MusicProvider>
            <BeatMachine />
          </MusicProvider>
        </MemoryRouter>
      </StrictMode>
    );
    await user.click(screen.getByRole('button', { name: 'BARRO', exact: true }));
    const primero = await screen.findByRole('button', {
      name: `Pad 1: ${CORTES_BARRO[0].label}`,
    });
    await screen.findByText((_, el) => el === primero && !primero.disabled);
    expect(primero).toBeEnabled();
  });

  it('el corte suena de verdad: su tramo, con la duración de su corte', async () => {
    vi.stubGlobal('fetch', vi.fn(audioDeBarro));
    let contexto;
    class Espia extends ContextoConBarro {
      constructor() {
        super();
        contexto = this;
      }
    }
    vi.stubGlobal('AudioContext', Espia);
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'BARRO', exact: true }));
    const primero = await screen.findByRole('button', {
      name: `Pad 1: ${CORTES_BARRO[0].label}`,
    });
    await waitFor(() => expect(primero).toBeEnabled());
    fireEvent.click(primero, { detail: 0 });
    const [{ source }] = contexto.started;
    expect(source.buffer.duration).toBeCloseTo(CORTES_BARRO[0].duracion, 2);
  });

  it('con REC y la mesa sonando, tocar cortes no cambia la rejilla', async () => {
    vi.stubGlobal('fetch', vi.fn(audioDeBarro));
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'BARRO', exact: true }));
    const primero = await screen.findByRole('button', {
      name: `Pad 1: ${CORTES_BARRO[0].label}`,
    });
    await waitFor(() => expect(primero).toBeEnabled());
    const encendidas = () =>
      screen
        .getAllByRole('button', { name: /, paso \d+$/ })
        .filter((c) => c.getAttribute('aria-pressed') === 'true').length;
    const antes = encendidas();
    await user.click(screen.getByRole('button', { name: 'Reproducir el beat' }));
    await user.click(screen.getByRole('button', { name: /REC/ }));
    fireEvent.click(primero, { detail: 0 });
    fireEvent.click(primero, { detail: 0 });
    expect(encendidas()).toBe(antes);
  });

  it('tras «Reintentar» el foco sigue en la mesa y los atajos funcionan', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementation(audioDeBarro);
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'BARRO', exact: true }));
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(document.querySelector('.mesa-wrap').contains(document.activeElement)).toBe(true);
  });

  it('si no se puede decodificar lo dice así, y reintentar no vuelve a descargar', async () => {
    const fetchMock = vi.fn(audioDeBarro);
    vi.stubGlobal('fetch', fetchMock);
    let falla = true;
    class Caprichoso extends ContextoConBarro {
      async decodeAudioData(datos) {
        if (falla) throw new Error('formato no soportado');
        return super.decodeAudioData(datos);
      }
    }
    vi.stubGlobal('AudioContext', Caprichoso);
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'BARRO', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no puede leer el audio de BARRO/);
    falla = false;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByRole('button', { name: `Pad 1: ${CORTES_BARRO[0].label}` });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: `Pad 1: ${CORTES_BARRO[0].label}` })).toBeEnabled()
    );
    expect(fetchMock.mock.calls.filter(([url]) => url === BARRO_URL)).toHaveLength(1);
  });

  it('el estado del banco se anuncia en una región viva que no se monta y desmonta', async () => {
    let soltar;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            soltar = () => resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
          })
      )
    );
    const user = userEvent.setup();
    montar();
    const region = document.querySelector('.pads-estado[role="status"]');
    expect(region).not.toBe(null);
    await user.click(screen.getByRole('button', { name: 'BARRO', exact: true }));
    expect(region).toHaveTextContent(/Cargando BARRO/);
    soltar();
    await waitFor(() => expect(region).toHaveTextContent(''));
    expect(document.querySelector('.pads-estado[role="status"]')).toBe(region);
  });

  it('la nota del pie no dice que no haya ningún sample', () => {
    montar();
    expect(screen.queryByText(/sin un solo sample/)).not.toBeInTheDocument();
    expect(screen.getByText(/menos los cortes de BARRO/)).toBeInTheDocument();
  });
});

describe('La consola', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const consola = () => screen.getByRole('region', { name: 'Consola' });
  const fila = (nombre) => filas().find((f) => within(f).queryByRole('button', { name: nombre }));

  it('tiene un canal por pista con fader, mute, solo y vúmetro, más el maestro', () => {
    montar();
    const c = consola();
    TRACKS.forEach((track) => {
      expect(
        within(c).getByRole('slider', { name: `Volumen de ${track.label}` })
      ).toBeInTheDocument();
      expect(within(c).getByRole('button', { name: `Silenciar ${track.label}` })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
      expect(within(c).getByRole('button', { name: `Dejar solo ${track.label}` })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    });
    expect(within(c).getByRole('slider', { name: 'Volumen del maestro' })).toBeInTheDocument();
    // Los vúmetros son decorativos: fuera del lector de pantalla.
    c.querySelectorAll('.canal-vu').forEach((vu) =>
      expect(vu).toHaveAttribute('aria-hidden', 'true')
    );
    expect(c.querySelectorAll('.canal-vu')).toHaveLength(TRACKS.length + 1);
  });

  it('la consola y las filas cambian el mismo estado', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(within(fila('Bombo')).getByRole('button', { name: 'Bombo' }));
    expect(within(consola()).getByRole('button', { name: 'Silenciar Bombo' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await user.click(within(consola()).getByRole('button', { name: 'Dejar solo Caja' }));
    expect(within(fila('Caja')).getByRole('button', { name: 'Solo de Caja' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.change(within(consola()).getByRole('slider', { name: 'Volumen de Hi-hat' }), {
      target: { value: '0.3' },
    });
    expect(within(fila('Hi-hat')).getByRole('slider', { name: 'Volumen de Hi-hat' })).toHaveValue(
      '0.3'
    );
  });

  it('lo guardado con la versión anterior aparece en la consola', () => {
    localStorage.setItem(
      'rocky-mesa-beats',
      JSON.stringify({
        bpm: 92,
        swing: 0.2,
        tono: 'do',
        niveles: [0.4, 0.85, 0.85, 0.85, 0.85, 0.85, 0.85, 0.85],
        mudas: [false, false, false, false, false, false, true, false],
      })
    );
    montar();
    const c = consola();
    expect(within(c).getByRole('slider', { name: 'Volumen de Bombo' })).toHaveValue('0.4');
    expect(within(c).getByRole('button', { name: 'Silenciar Tom' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('el fader anuncia su valor', () => {
    montar();
    const fader = within(consola()).getByRole('slider', { name: 'Volumen de Caja' });
    expect(fader).toHaveAttribute('aria-valuetext', '85 %');
  });
});
