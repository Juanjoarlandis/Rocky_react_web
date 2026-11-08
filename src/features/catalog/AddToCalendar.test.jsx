import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AddToCalendar from './AddToCalendar';

const DROP = {
  handle: 'rocky-drop-4',
  shortTitle: 'Drop 4',
  launchAt: '2026-10-10T20:00:00+02:00',
  launchMinutes: 60,
};

describe('Añadir el drop al calendario', () => {
  it('sin fecha no aparece', () => {
    const { container } = render(<AddToCalendar drop={{ ...DROP, launchAt: null }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('con fecha ofrece el .ics y Google, con la hora de Madrid', () => {
    render(<AddToCalendar drop={DROP} />);
    expect(screen.getByText(/10 de octubre/)).toHaveTextContent('20:00');
    expect(screen.getByRole('link', { name: 'Añadir al calendario' })).toHaveAttribute(
      'href',
      '/api/drop/calendario.ics'
    );
    expect(screen.getByRole('link', { name: 'Google Calendar' }).getAttribute('href')).toContain(
      'calendar.google.com'
    );
  });
});
