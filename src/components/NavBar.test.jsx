import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import NavBar from './NavBar.jsx';

const navBarCss = readFileSync('src/styles/NavBar.css', 'utf8');

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

describe('NavBar responsive contract', () => {
  it('compacts the last single-row range and switches to two rows at 720px', () => {
    expect(navBarCss).toMatch(
      /@media \(min-width: 721px\) and \(max-width: 800px\)[\s\S]*?\.navbar-links\s*\{[\s\S]*?gap:/
    );
    expect(navBarCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.navbar-inner\s*\{[\s\S]*?flex-direction:\s*column;/
    );
    expect(navBarCss).not.toContain('@media (max-width: 560px)');
  });

  it('keeps every navigation destination at least 44px tall', () => {
    for (const selector of ['navbar-brand', 'navbar-link', 'navbar-account', 'navbar-cart']) {
      expect(navBarCss).toMatch(
        new RegExp(`\\.${selector}\\s*\\{[\\s\\S]*?min-height:\\s*44px;`)
      );
    }

    expect(navBarCss).toMatch(
      /\.navbar-account\.navbar-account--avatar\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;[\s\S]*?flex:\s*0 0 44px;/
    );
    expect(navBarCss).not.toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.navbar-account\.navbar-account--avatar\s*\{[\s\S]*?(?:width|height|flex-basis):\s*(?:3[0-9]|4[0-3])px;/
    );
  });
});
