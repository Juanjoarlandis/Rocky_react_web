import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CartRunner, { CRUCE_MS, medidas, planRun } from './CartRunner.jsx';

const VIEW = Object.freeze({ width: 1280, height: 800 });
// El icono del carrito vive en la esquina de arriba a la derecha.
const ICONO = Object.freeze({
  left: 1180,
  right: 1224,
  top: 20,
  bottom: 64,
  width: 44,
  height: 44,
});

function montaIcono(rect = ICONO) {
  const nodo = document.createElement('a');
  nodo.className = 'navbar-cart';
  nodo.getBoundingClientRect = () => rect;
  document.body.appendChild(nodo);
  return nodo;
}

function advance(ms) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('CartRunner: cuánto mide', () => {
  it('mantiene la proporción del dibujo', () => {
    const { ancho, alto } = medidas(1280);
    expect(ancho / alto).toBeCloseTo(589 / 600, 2);
  });

  it('no se pasa de grande en pantallas anchas ni desaparece en móvil', () => {
    expect(medidas(2560).alto).toBe(96);
    expect(medidas(375).alto).toBe(56);
  });
});

describe('CartRunner: por dónde corre', () => {
  it('acaba con su centro sobre el centro del icono', () => {
    const size = medidas(VIEW.width);
    const plan = planRun(ICONO, size, VIEW);

    expect(plan.hastaX + size.ancho / 2).toBeCloseTo(ICONO.left + ICONO.width / 2, 0);
    expect(plan.saltoY + size.alto / 2).toBeCloseTo(ICONO.top + ICONO.height / 2, 0);
  });

  it('corre por debajo de la barra, sin que se le salga la cabeza por arriba', () => {
    const size = medidas(VIEW.width);
    const plan = planRun(ICONO, size, VIEW);

    // El carril entero cae dentro de la ventana: es lo que centrarlo en el
    // icono no conseguía, porque mide más que el alto de la barra.
    expect(plan.correY).toBeGreaterThanOrEqual(ICONO.bottom);
    expect(plan.correY + size.alto).toBeLessThanOrEqual(VIEW.height);
    // Y el salto final va hacia arriba, hacia el icono.
    expect(plan.saltoY).toBeLessThan(plan.correY);
  });

  it('arranca fuera de cuadro por la izquierda, ya lanzado', () => {
    const size = medidas(VIEW.width);
    const plan = planRun(ICONO, size, VIEW);

    expect(plan.desdeX + size.ancho).toBeLessThan(0);
  });

  it('baja el carril por debajo de lo que esté aparcado donde frena', () => {
    const size = medidas(VIEW.width);
    // La píldora de la radio vive justo debajo del carrito.
    const radio = { left: 1080, right: 1255, top: 76, bottom: 144, width: 175, height: 68 };
    const plan = planRun(ICONO, size, VIEW, [radio]);

    expect(plan.correY).toBeGreaterThanOrEqual(radio.bottom);
  });

  it('no se agacha por un trasto que esté en la otra punta', () => {
    const size = medidas(VIEW.width);
    const lejos = { left: 0, right: 200, top: 76, bottom: 400, width: 200, height: 324 };
    const plan = planRun(ICONO, size, VIEW, [lejos]);

    expect(plan.correY).toBe(ICONO.bottom + 10);
  });

  it('no se sale por abajo en una ventana apaisada', () => {
    const size = medidas(VIEW.width);
    const bajita = { width: VIEW.width, height: 240 };
    const enorme = { left: 1080, right: 1255, top: 76, bottom: 600, width: 175, height: 524 };
    const plan = planRun(ICONO, size, bajita, [enorme]);

    expect(plan.correY + size.alto).toBeLessThanOrEqual(bajita.height);
  });

  it('no corre a ninguna parte si el icono no está en pantalla', () => {
    const size = medidas(VIEW.width);

    expect(planRun({ ...ICONO, top: -120, bottom: -76 }, size, VIEW)).toBeNull();
    expect(planRun({ ...ICONO, width: 0, height: 0 }, size, VIEW)).toBeNull();
    expect(planRun(null, size, VIEW)).toBeNull();
  });
});

describe('CartRunner: cuándo sale', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    montaIcono();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('no hay nadie corriendo hasta que se añade algo', () => {
    render(<CartRunner runId={0} />);
    expect(screen.queryByTestId('cart-runner')).toBeNull();
  });

  it('sale al añadir y se recoge solo al llegar', () => {
    const { rerender } = render(<CartRunner runId={0} />);

    rerender(<CartRunner runId={1} />);
    expect(screen.getByTestId('cart-runner')).toBeInTheDocument();

    advance(CRUCE_MS + 120);
    expect(screen.queryByTestId('cart-runner')).toBeNull();
  });

  it('dos añadidos seguidos reinician la carrera en vez de dejarla a medias', () => {
    const { rerender } = render(<CartRunner runId={1} />);
    const primera = screen.getByTestId('cart-runner');

    advance(CRUCE_MS / 2);
    rerender(<CartRunner runId={2} />);

    // Nodo nuevo: la animación vuelve a empezar desde el canto izquierdo.
    expect(screen.getByTestId('cart-runner')).not.toBe(primera);
  });

  it('no sale con el movimiento reducido', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
      }))
    );

    render(<CartRunner runId={1} />);
    expect(screen.queryByTestId('cart-runner')).toBeNull();
  });

  it('no sale durante el splash', () => {
    render(<CartRunner runId={1} disabled />);
    expect(screen.queryByTestId('cart-runner')).toBeNull();
  });

  it('no sale si no hay barra donde esté el carrito', () => {
    document.body.innerHTML = '';
    render(<CartRunner runId={1} />);
    expect(screen.queryByTestId('cart-runner')).toBeNull();
  });
});
