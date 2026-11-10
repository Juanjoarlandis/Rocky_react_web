import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCrewProfile } from './useCrewProfile.js';

vi.mock('../../api/shopify.js', () => ({ getCrewProfile: vi.fn(async () => ({ profile: null })) }));

describe('useCrewProfile', () => {
  it('devuelve el mismo objeto entre renders mientras nada cambia', () => {
    const { result, rerender } = renderHook(() => useCrewProfile({ enabled: false }));
    const first = result.current;

    rerender();
    rerender();

    expect(result.current).toBe(first);
  });

  it('devuelve un objeto nuevo cuando cambia el avatar', async () => {
    const { result } = renderHook(() => useCrewProfile({ enabled: false }));
    const first = result.current;
    const { act } = await import('@testing-library/react');

    act(() => first.applyAvatar('diana-jefe'));

    expect(result.current).not.toBe(first);
    expect(result.current.equippedAvatarId).toBe('diana-jefe');
  });
});
