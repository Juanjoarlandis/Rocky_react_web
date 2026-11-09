import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AddToCalendar from './AddToCalendar';

// Un drop público (calendario-de-drops): el calendario es el de ese drop.
const DROP = {
  handle: 'rocky-drop-4',
  number: 4,
  state: 'anunciado',
  launchAt: '2026-10-10T20:00:00+02:00',
};

describe('Añadir el drop al calendario', () => {
  it('sin fecha no aparece', () => {
    const { container } = render(<AddToCalendar drop={{ ...DROP, launchAt: null }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('con fecha ofrece el .ics y Google, con la hora de Madrid', () => {
    render(<AddToCalendar drop={DROP} />);
    expect(screen.getByText(/sábado 10 de octubre/)).toHaveTextContent('20:00');
    expect(screen.getByText(/hora de Madrid/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Añadir al calendario' })).toHaveAttribute(
      'href',
      '/api/drops/rocky-drop-4/calendario.ics'
    );
    expect(screen.getByRole('link', { name: 'Google Calendar' }).getAttribute('href')).toContain(
      'calendar.google.com'
    );
  });

  it('sin drop no aparece', () => {
    const { container } = render(<AddToCalendar drop={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
