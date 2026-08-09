import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CrewProfile from './CrewProfile.jsx';

const api = vi.hoisted(() => ({
  equipCrewReward: vi.fn(),
  getCrewProfile: vi.fn(),
  redeemCrewReward: vi.fn(),
}));

vi.mock('../shopify/api.js', () => api);

function profile(overrides = {}) {
  return {
    displayName: 'Juanjo',
    xp: 120,
    ticketBalance: 10,
    lifetimeTicketsEarned: 10,
    lifetimeTicketsSpent: 0,
    equippedAvatarId: 'skater-head',
    equippedFrameId: null,
    collectionCount: 2,
    level: {
      name: 'Del Barrio',
      currentXp: 120,
      nextXp: 300,
      nextLevelName: 'Crew Member',
      progress: 10,
    },
    rewards: [
      {
        id: 'skater-head',
        kind: 'avatar',
        name: 'Skater 035',
        description: 'La primera cara.',
        unlockMode: 'level',
        requiredXp: 0,
        ticketCost: 0,
        owned: true,
        equipped: true,
        available: false,
        locked: false,
      },
      {
        id: 'dormido-head',
        kind: 'avatar',
        name: 'El Dormido',
        description: 'Cero prisa.',
        unlockMode: 'level',
        requiredXp: 100,
        ticketCost: 0,
        owned: true,
        equipped: false,
        available: false,
        locked: false,
      },
      {
        id: 'frame-red-squiggle',
        kind: 'frame',
        name: 'Marco Trazo Rojo',
        description: 'Marco rojo.',
        unlockMode: 'tickets',
        requiredXp: 100,
        ticketCost: 5,
        owned: false,
        equipped: false,
        available: true,
        locked: false,
      },
      {
        id: 'grafitero-spray',
        kind: 'avatar',
        name: 'Grafitero Spray',
        description: 'Con la lata.',
        unlockMode: 'tickets',
        requiredXp: 300,
        ticketCost: 18,
        owned: false,
        equipped: false,
        available: false,
        locked: true,
      },
    ],
    purchases: [
      {
        orderName: '#1035',
        amount: '100.00',
        currency: 'EUR',
        xpEarned: 100,
        ticketsEarned: 10,
        items: ['Rockydz Boyz'],
        processedAt: '2026-08-07T18:00:00Z',
      },
    ],
    activity: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CrewProfile', () => {
  it('shows a visual Crew preview before Shopify accounts are connected', () => {
    render(
      <CrewProfile
        accountEnabled={false}
        account={{ loggedIn: false, customer: null }}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', {
      name: /mira lo que vas a desbloquear/i,
    })).toBeInTheDocument();
    const levels = screen.getByRole('region', { name: /escalones crew/i });
    expect(within(levels).getByText('Del Barrio')).toBeInTheDocument();
    expect(within(levels).getByText('Crew Member')).toBeInTheDocument();
    expect(within(levels).getByText('Leyenda 035')).toBeInTheDocument();
    expect(screen.getByRole('img', {
      name: /vista previa del avatar el dormido/i,
    })).toBeInTheDocument();
    // Va colgado del panel, no suelto en la página: es lo que le da el canto
    // sobre el que se apoya. Suelto parece un muñeco flotando.
    expect(screen.getByTestId('crew-corner-character').parentElement).toHaveClass(
      'crew-gate-preview'
    );
    expect(api.getCrewProfile).not.toHaveBeenCalled();
  });

  it('shows the Shopify login path without requesting private Crew data', () => {
    render(
      <CrewProfile
        accountEnabled
        account={{ loggedIn: false, customer: null }}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /entrar en la crew/i })).toHaveAttribute(
      'href',
      '/api/shopify/account/login?returnPath=%2Fmi-crew'
    );
    expect(api.getCrewProfile).not.toHaveBeenCalled();
  });

  it('lets visitors flip early Crew cards to inspect their reverse', async () => {
    const user = userEvent.setup();
    render(
      <CrewProfile
        accountEnabled={false}
        account={{ loggedIn: false, customer: null }}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('button', {
      name: /cromo de el dormilón.*ver el expediente/i,
    })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', {
      name: /cromo de el colgao.*ver el expediente/i,
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: /cromo de el ollie.*ver el expediente/i,
    })).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: /cromo de el dormilón.*ver el expediente/i,
    }));

    expect(screen.getByRole('button', {
      name: /cromo de el dormilón.*ver el frente/i,
    })).toHaveAttribute('aria-pressed', 'true');
  });

  it('loads progression and updates the locker after equip and redemption', async () => {
    const initial = profile();
    const equipped = profile({ equippedAvatarId: 'dormido-head' });
    const redeemed = profile({
      equippedFrameId: 'frame-red-squiggle',
      ticketBalance: 5,
    });
    api.getCrewProfile.mockResolvedValue({ profile: initial });
    api.equipCrewReward.mockResolvedValue({ profile: equipped });
    api.redeemCrewReward.mockResolvedValue({ profile: redeemed });
    const user = userEvent.setup();
    const onAvatarChange = vi.fn();

    render(
      <CrewProfile
        accountEnabled
        account={{ loggedIn: true, customer: { displayName: 'Juanjo' } }}
        onLogout={vi.fn()}
        onAvatarChange={onAvatarChange}
      />
    );

    expect(await screen.findByRole('heading', { name: /juanjo/i })).toBeInTheDocument();
    expect(screen.getByTestId('crew-corner-character').parentElement).toHaveClass(
      'crew-progress-panel'
    );
    expect(screen.getByRole('heading', { name: 'Del Barrio' })).toBeInTheDocument();
    expect(screen.getByText(/120 \/ 300 XP/i)).toBeInTheDocument();
    expect(screen.getByText(/10 Crew Tickets/i)).toBeInTheDocument();
    expect(onAvatarChange).toHaveBeenLastCalledWith('skater-head');

    await user.click(screen.getByRole('button', { name: /equipar el dormido/i }));
    await waitFor(() => expect(api.equipCrewReward).toHaveBeenCalledWith('dormido-head'));
    expect(onAvatarChange).toHaveBeenLastCalledWith('dormido-head');

    await user.click(screen.getByRole('button', { name: /canjear marco trazo rojo/i }));
    await waitFor(() => expect(api.redeemCrewReward).toHaveBeenCalledWith({
      rewardId: 'frame-red-squiggle',
    }));
    expect(await screen.findByText(/5 Crew Tickets/i)).toBeInTheDocument();
    expect(screen.getByText('#1035')).toBeInTheDocument();
  });
});
