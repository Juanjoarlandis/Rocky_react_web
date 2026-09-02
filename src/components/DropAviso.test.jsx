import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DropAviso from './DropAviso.jsx';

function rellenaYEnvia({ email = 'crew@rocky.test', permiso = true } = {}) {
  fireEvent.change(screen.getByLabelText('Tu email para el aviso del drop'), {
    target: { value: email },
  });
  if (permiso) fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.submit(screen.getByTestId('drop-aviso'));
}

describe('DropAviso: el mostrador de avisos del drop', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('manda el alta con permiso y estampa el recibo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, duplicate: false, product: 'signal-ghost' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<DropAviso producto="signal-ghost" />);
    rellenaYEnvia();

    await waitFor(() => expect(screen.getByTestId('drop-aviso-listo')).toBeInTheDocument());
    expect(screen.getByText('El Recadero te lo trae el día del drop.')).toBeInTheDocument();

    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/avisos');
    expect(JSON.parse(opciones.body)).toEqual({
      producto: 'signal-ghost',
      email: 'crew@rocky.test',
      consentimiento: true,
      apodo: '',
    });
    // Y se acuerda para la próxima visita.
    expect(localStorage.getItem('rocky-aviso-signal-ghost')).toBe('1');
  });

  it('manda consentimiento false si se salta la casilla, y el servidor decide', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Necesitamos tu permiso para apuntarte.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<DropAviso producto="signal-ghost" />);
    rellenaYEnvia({ permiso: false });

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Necesitamos tu permiso')
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).consentimiento).toBe(false);
    // Sin alta no hay recuerdo.
    expect(localStorage.getItem('rocky-aviso-signal-ghost')).toBeNull();
  });

  it('si el servidor no responde, lo cuenta y deja reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')));

    render(<DropAviso producto="signal-ghost" />);
    rellenaYEnvia();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('No hemos podido apuntarte')
    );
    expect(screen.getByTestId('drop-aviso')).toBeInTheDocument();
  });

  it('con el recibo guardado de otra visita, ni enseña el formulario', () => {
    localStorage.setItem('rocky-aviso-signal-ghost', '1');
    vi.stubGlobal('fetch', vi.fn());

    render(<DropAviso producto="signal-ghost" />);

    expect(screen.getByTestId('drop-aviso-listo')).toBeInTheDocument();
    expect(screen.queryByTestId('drop-aviso')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lleva el campo trampa escondido para que sólo lo rellenen bots', () => {
    vi.stubGlobal('fetch', vi.fn());
    const { container } = render(<DropAviso producto="signal-ghost" />);

    const trampa = container.querySelector('input[name="apodo"]');
    expect(trampa).toHaveAttribute('aria-hidden', 'true');
    expect(trampa).toHaveAttribute('tabindex', '-1');
  });
});
