import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import NavBar from './NavBar.jsx';

const navBarCss = readFileSync('src/styles/components/navbar.css', 'utf8');

function renderNavBar(props = {}) {
  return render(
    <MemoryRouter>
      <NavBar
        totalItems={0}
        accountEnabled={false}
        account={{ loggedIn: false, customer: null }}
        {...props}
      />
    </MemoryRouter>
  );
}

describe('NavBar Crew entry', () => {
  it('keeps Mi Crew discoverable before Shopify Customer Accounts are connected', () => {
    renderNavBar();
    const links = screen.getAllByRole('link', { name: 'Mi Crew' });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/mi-crew'));
  });

  it('shows the equipped Crew avatar instead of the customer name or email', () => {
    renderNavBar({
      accountEnabled: true,
      account: { loggedIn: true, customer: { displayName: 'juanjo@example.com' } },
      crewAvatarId: 'dormido-head',
    });

    const crewLink = screen.getByRole('link', { name: 'Mi Crew' });
    const avatar = crewLink.querySelector('img');

    expect(crewLink).toHaveAttribute('href', '/mi-crew');
    expect(avatar).toHaveAttribute('src', expect.stringContaining('dormido-head'));
    expect(avatar).toHaveAttribute('alt', '');
    expect(screen.queryByText('juanjo@example.com')).not.toBeInTheDocument();
  });

  it('announces the cart with its item count', () => {
    renderNavBar({ totalItems: 3 });
    expect(screen.getByRole('link', { name: 'Carrito, 3 artículos' })).toHaveAttribute(
      'href',
      '/cart'
    );
  });
});

describe('NavBar mobile menu', () => {
  it('opens a sheet with the six destinations, traps focus and closes with Escape', () => {
    renderNavBar();
    const button = screen.getByRole('button', { name: 'Abrir el menú' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(button);

    const sheet = screen.getByRole('dialog', { name: 'Menú' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', sheet.id);
    const links = within(sheet).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Tienda',
      'Drops',
      'Estudio',
      'Crew',
      'Rocky IA',
      'Mi Crew',
    ]);
    expect(document.activeElement).toBe(links[0]);

    // Shift+Tab desde el primer enlace vuelve al último control de la hoja
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(sheet.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(links[0]);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(button);
  });

  it('closes the sheet when a destination is chosen', () => {
    renderNavBar();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el menú' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Drops' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('NavBar responsive contract', () => {
  it('keeps a single row on every width: links hide behind the menu button at 640px', () => {
    expect(navBarCss).not.toMatch(/\.navbar-inner\s*\{[^}]*flex-direction:\s*column/);
    expect(navBarCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*?\.navbar-links,\s*\.navbar-tools > \.navbar-theme\s*\{[\s\S]*?display:\s*none;/
    );
    expect(navBarCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*?\.navbar-menu\s*\{[\s\S]*?display:\s*flex;/
    );
  });

  it('every control has an accessible name and the two navigations are labelled', () => {
    renderNavBar({ totalItems: 2 });
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    const names = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(names).toEqual(['Tienda', 'Drops', 'Estudio', 'Crew', 'Rocky IA', 'Mi Crew']);
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Carrito, 2 artículos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /neón/ })).toHaveAttribute('aria-pressed');
    expect(screen.getByRole('button', { name: 'Abrir el menú' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});
