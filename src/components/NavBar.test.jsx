import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import NavBar from './NavBar.jsx';

describe('NavBar Crew entry', () => {
  it('keeps Mi Crew discoverable before Shopify Customer Accounts are connected', () => {
    render(
      <MemoryRouter>
        <NavBar
          totalItems={0}
          accountEnabled={false}
          account={{ loggedIn: false, customer: null }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Mi Crew' })).toHaveAttribute(
      'href',
      '/mi-crew'
    );
  });

  it('shows the equipped Crew avatar instead of the customer name or email', () => {
    render(
      <MemoryRouter>
        <NavBar
          totalItems={0}
          accountEnabled
          account={{
            loggedIn: true,
            customer: { displayName: 'juanjo@example.com' },
          }}
          crewAvatarId="dormido-head"
        />
      </MemoryRouter>
    );

    const crewLink = screen.getByRole('link', { name: 'Abrir MiCrew' });
    const avatar = crewLink.querySelector('img');

    expect(crewLink).toHaveAttribute('href', '/mi-crew');
    expect(avatar).toHaveAttribute('src', expect.stringContaining('dormido-head'));
    expect(avatar).toHaveAttribute('alt', '');
    expect(screen.queryByText('juanjo@example.com')).not.toBeInTheDocument();
  });
});
