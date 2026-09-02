import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Lightbox from './Lightbox.jsx';

/* jsdom no implementa showModal(): se simula lo justo para saber si se ha
   abierto y para que el diálogo capture el foco como en un navegador. */
function stubDialog() {
  const proto = window.HTMLDialogElement.prototype;
  const showModal = vi.fn(function open() {
    this.setAttribute('open', '');
    this.querySelector('button')?.focus();
  });
  const close = vi.fn(function closeDialog() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
  Object.defineProperty(proto, 'showModal', {
    value: showModal,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(proto, 'close', { value: close, configurable: true, writable: true });
  return { showModal, close };
}

function restoreDialog() {
  const proto = window.HTMLDialogElement.prototype;
  delete proto.showModal;
  delete proto.close;
}

describe('Lightbox', () => {
  afterEach(() => {
    restoreDialog();
    vi.restoreAllMocks();
  });

  it('abre un diálogo modal nativo con el foco dentro y cierra con Escape', () => {
    const { showModal } = stubDialog();
    const onClose = vi.fn();
    render(<Lightbox src="/foto.webp" alt="Camiseta 35 RED" onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'Camiseta 35 RED' });
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute('open');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar' }));

    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra con el botón y al pinchar fuera de la foto, pero no sobre ella', () => {
    stubDialog();
    const onClose = vi.fn();
    render(<Lightbox src="/foto.webp" alt="Camiseta" onClose={onClose} />);

    fireEvent.click(screen.getByRole('img', { name: 'Camiseta' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('devuelve el foco al elemento que la abrió al desmontarse', () => {
    const { close } = stubDialog();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<Lightbox src="/foto.webp" alt="Camiseta" onClose={vi.fn()} />);
    unmount();
    expect(close).toHaveBeenCalledTimes(1);
    opener.remove();
  });
});
