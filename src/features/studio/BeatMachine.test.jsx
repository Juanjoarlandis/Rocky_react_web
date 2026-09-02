import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import BeatMachine from './BeatMachine.jsx';
import { MusicProvider } from '../../context/MusicContext.jsx';
import { PAD_TECLAS, TRACKS } from '../../data/mesa';
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
