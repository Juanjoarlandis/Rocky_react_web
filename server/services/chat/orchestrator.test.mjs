import { describe, expect, it, vi } from 'vitest';
import { loadCrewChatContext } from './orchestrator.mjs';

describe('Rocky IA verified Crew context', () => {
  it('does not load private data for an anonymous session', async () => {
    const customerAccounts = { getCustomerProfile: vi.fn() };
    const crewRewards = { getContext: vi.fn() };

    const context = await loadCrewChatContext({
      session: { record: {} },
      customerAccounts,
      crewRewards,
      logger: console,
      requestId: 'request-anonymous',
    });

    expect(context).toBe('');
    expect(customerAccounts.getCustomerProfile).not.toHaveBeenCalled();
    expect(crewRewards.getContext).not.toHaveBeenCalled();
  });

  it('builds a server-owned context from the authenticated Shopify customer', async () => {
    const customerAccounts = {
      getCustomerProfile: vi.fn().mockResolvedValue({
        id: 'gid://shopify/Customer/35',
        displayName: 'Texto que no debe entrar en el prompt',
        email: 'privado@example.com',
      }),
    };
    const crewRewards = {
      getContext: vi.fn().mockResolvedValue({
        level: 'Del Barrio',
        xp: 120,
        ticketBalance: 10,
        nextLevel: 'Crew Member',
        nextXp: 300,
        collectionCount: 2,
        equippedAvatar: 'El Dormido',
      }),
    };

    const context = await loadCrewChatContext({
      session: { record: { customerTokenId: 'customer-token-35' } },
      customerAccounts,
      crewRewards,
      logger: console,
      requestId: 'request-member',
    });

    expect(customerAccounts.getCustomerProfile).toHaveBeenCalledWith('customer-token-35');
    expect(crewRewards.getContext).toHaveBeenCalledWith('gid://shopify/Customer/35');
    expect(context).toContain('PERFIL CREW VERIFICADO');
    expect(context).toContain('Nivel: Del Barrio');
    expect(context).toContain('120 XP');
    expect(context).toContain('10 Crew Tickets');
    expect(context).toContain('Avatar equipado: El Dormido');
    expect(context).not.toContain('privado@example.com');
    expect(context).not.toContain('Texto que no debe entrar');
  });

  it('keeps chat available if the Shopify account lookup fails', async () => {
    const logger = { error: vi.fn() };
    const context = await loadCrewChatContext({
      session: { record: { customerTokenId: 'expired-token' } },
      customerAccounts: {
        getCustomerProfile: vi.fn().mockRejectedValue(new Error('sensitive detail')),
      },
      crewRewards: { getContext: vi.fn() },
      logger,
      requestId: 'request-error',
    });

    expect(context).toBe('');
    expect(logger.error).toHaveBeenCalledWith('Rocky IA Crew context could not be loaded', {
      requestId: 'request-error',
      reason: 'crew_context_error',
    });
  });
});
