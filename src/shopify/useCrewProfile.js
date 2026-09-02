import { useCallback, useEffect, useState } from 'react';
import { getCrewProfile } from './api.js';
import { DEFAULT_AVATAR_ID } from '../config/commerce.js';
import { errorMessage } from '../utils/errors.js';

/* El perfil Crew (XP, tickets, avatar equipado) se pide una sola vez por
   sesión iniciada. El dueño es este hook: la navbar sólo lee el avatar y la
   página Mi Crew aplica los perfiles que devuelven sus mutaciones. */
export function useCrewProfile({ enabled = false } = {}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      setLoading(false);
      setError('');
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError('');
    getCrewProfile()
      .then((response) => {
        if (active) setProfile(response.profile ?? null);
      })
      .catch((requestError) => {
        // La cuenta sigue siendo útil aunque el perfil Crew no responda.
        if (active) {
          setError(errorMessage(requestError, 'La Crew no ha podido completar la operación.'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  const applyProfile = useCallback((nextProfile) => {
    if (nextProfile && typeof nextProfile === 'object') setProfile(nextProfile);
  }, []);

  // Cambiar sólo el avatar (lo usa la navbar en cuanto se equipa uno nuevo)
  const applyAvatar = useCallback((avatarId) => {
    if (typeof avatarId !== 'string' || !avatarId.trim()) return;
    setProfile((current) => ({ ...(current || {}), equippedAvatarId: avatarId }));
  }, []);

  return {
    profile,
    loading,
    error,
    applyProfile,
    applyAvatar,
    equippedAvatarId: profile?.equippedAvatarId || DEFAULT_AVATAR_ID,
  };
}
