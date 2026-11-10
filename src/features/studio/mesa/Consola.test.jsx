import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TRACKS } from '../../../data/mesa';
import Consola from './Consola.jsx';

const todas = (valor) => TRACKS.map(() => valor);

function consola(props = {}) {
  const metersRef = { current: [] };
  const acciones = { onMute: vi.fn(), onSolo: vi.fn(), onLevel: vi.fn(), onVolume: vi.fn() };
  render(
    <Consola
      levels={todas(0.8)}
      mutes={todas(false)}
      solos={todas(false)}
      volume={0.85}
      audible={() => true}
      metersRef={metersRef}
      {...acciones}
      {...props}
    />
  );
  return { region: screen.getByRole('region', { name: 'Consola' }), metersRef, ...acciones };
}

describe('La consola de la mesa', () => {
  it('cada canal rotula su pista en la cinta y conserva fader, mute y solo con su nombre', () => {
    const { region } = consola();
    for (const track of TRACKS) {
      expect(within(region).getByText(track.cinta)).toBeInTheDocument();
      expect(
        within(region).getByRole('slider', { name: `Volumen de ${track.label}` })
      ).toHaveAttribute('aria-valuetext', '80 %');
      expect(
        within(region).getByRole('button', { name: `Silenciar ${track.label}` })
      ).toHaveAttribute('aria-pressed', 'false');
      expect(
        within(region).getByRole('button', { name: `Dejar solo ${track.label}` })
      ).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('el maestro tiene su cinta, su fader y su vúmetro, y se distingue de las pistas', () => {
    const { region, metersRef } = consola();
    const maestro = within(region).getByText('Máster').closest('.canal');
    expect(maestro).toHaveClass('canal--maestro');
    expect(within(maestro).getByRole('slider', { name: 'Volumen del maestro' })).toHaveAttribute(
      'aria-valuetext',
      '85 %'
    );
    // Un vúmetro por canal, en el orden de las pistas y el maestro al final
    expect(metersRef.current).toHaveLength(TRACKS.length + 1);
    expect(maestro).toContainElement(metersRef.current[TRACKS.length]);
  });

  it('el canal de una pista que no suena se ve callado', () => {
    const { region } = consola({ audible: (index) => index !== 1 });
    expect(within(region).getByText(TRACKS[1].cinta).closest('.canal')).toHaveClass('is-callado');
    expect(within(region).getByText(TRACKS[0].cinta).closest('.canal')).not.toHaveClass(
      'is-callado'
    );
  });

  it('mover un fader, silenciar y dejar solo avisan a la mesa', () => {
    const { region, onLevel, onMute, onSolo, onVolume } = consola();
    fireEvent.change(within(region).getByRole('slider', { name: 'Volumen de Caja' }), {
      target: { value: '0.5' },
    });
    expect(onLevel).toHaveBeenCalledWith(1, 0.5);
    fireEvent.click(within(region).getByRole('button', { name: 'Silenciar Bombo' }));
    expect(onMute).toHaveBeenCalledWith(0);
    fireEvent.click(within(region).getByRole('button', { name: 'Dejar solo Tom' }));
    expect(onSolo).toHaveBeenCalledWith(6);
    fireEvent.change(within(region).getByRole('slider', { name: 'Volumen del maestro' }), {
      target: { value: '0.4' },
    });
    expect(onVolume).toHaveBeenCalledWith(0.4);
  });
});
