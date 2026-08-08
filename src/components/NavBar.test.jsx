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
});
