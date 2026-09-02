import { useEffect, useMemo, useState } from 'react';
import { equipCrewReward, redeemCrewReward } from '../shopify/api.js';
import { useCrewProfile } from '../shopify/useCrewProfile.js';
import { CREW } from '../data/crew.js';
import { getCrewAvatarImage } from '../data/crewAvatarImages.js';
import { ROUTES, accountLoginUrl } from '../config/routes.js';
import larguiruchoEsquina from '../images/optimized/characters/larguirucho-esquina-600.webp';
import { CrewCard } from './Crew.jsx';
import '../styles/pages/crew-profile.css';

const CREW_PREVIEW_CARDS = [
  { id: 'dormilon', unlock: '100 XP · DEL BARRIO' },
  { id: 'colgao', unlock: '300 XP · CREW MEMBER' },
  { id: 'ollie', unlock: '100 XP · 12 TICKETS' },
].map(({ id, unlock }) => ({
  miembro: CREW.find((candidate) => candidate.id === id),
  unlock,
}));

function formatDate(value) {
  if (!value) return 'Pedido acreditado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pedido acreditado';
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function errorText(error) {
  return error instanceof Error ? error.message : 'La Crew no ha podido completar la operación.';
}

function CrewCornerCharacter({ className = '' }) {
  return (
    <img
      className={`doodle crew-corner-character neon-art al-ritmo ${className}`.trim()}
      style={{ '--fase': '0.7' }}
      src={larguiruchoEsquina}
      width="600"
      height="838"
      decoding="async"
      alt=""
      aria-hidden="true"
      data-testid="crew-corner-character"
    />
  );
}

function CrewGate({ accountEnabled }) {
  return (
    <section className="crew-profile-page crew-profile-gate">
      <div className="crew-gate-hero">
        <div className="crew-gate-copy">
          <span className="crew-kicker">ROCKY CREW REWARDS</span>
          <h1 className="page-title">Tu sitio en la colmena</h1>
          <p>
            Compra, suma XP, sube escalones y desbloquea los personajes de la banda. Los Crew
            Tickets se gastan; tu nivel se queda contigo.
          </p>
          {accountEnabled ? (
            <a className="btn btn--primary crew-gate-button" href={accountLoginUrl(ROUTES.myCrew)}>
              Entrar en la Crew
            </a>
          ) : (
            <p className="crew-gate-status" role="status">
              Vista previa activa. Conectaremos Shopify para guardar tu progreso real.
            </p>
          )}
        </div>
      </div>

      <div className="crew-gate-preview" aria-labelledby="crew-preview-title">
        <CrewCornerCharacter />
        <div className="crew-gate-preview-heading">
          <div>
            <span className="crew-section-label">VISTA PREVIA · SIN DATOS REALES</span>
            <h2 id="crew-preview-title">Mira lo que vas a desbloquear</h2>
          </div>
          <p>Tu carnet cambia contigo: más XP, más caras y más piezas de la banda.</p>
        </div>

        <div className="crew-gate-preview-grid">
          <article className="crew-id-card crew-preview-id-card">
            <span className="crew-id-card__serial">MEMBER // 035</span>
            <div className="crew-current-avatar crew-current-avatar--frame-red-squiggle">
              <img
                src={getCrewAvatarImage('dormido-head')}
                alt="Vista previa del avatar El Dormido"
                className="neon-art"
              />
            </div>
            <span className="crew-id-card__level">Del Barrio</span>
            <strong>TU PERFIL</strong>
            <p>Avatar, marco y colección propios</p>
          </article>

          <div className="crew-gate-preview-content">
            <section className="crew-preview-level-panel" aria-label="Escalones Crew">
              <span className="crew-section-label">SUBE DE ESCALÓN</span>
              <div className="crew-preview-levels">
                <article>
                  <span>100 XP</span>
                  <strong>Del Barrio</strong>
                </article>
                <article>
                  <span>300 XP</span>
                  <strong>Crew Member</strong>
                </article>
                <article>
                  <span>3.000 XP</span>
                  <strong>Leyenda 035</strong>
                </article>
              </div>
            </section>

            <section
              className="crew-preview-card-showcase"
              aria-labelledby="crew-preview-cards-title"
            >
              <div className="crew-preview-card-heading">
                <div>
                  <span className="crew-section-label">CROMOS DE NIVEL BAJO</span>
                  <h3 id="crew-preview-cards-title">Tócalos y dales la vuelta</h3>
                </div>
                <p>El frente trae sus stats. Detrás vive el expediente de cada personaje.</p>
              </div>
              <div className="crew-preview-card-grid">
                {CREW_PREVIEW_CARDS.map(({ miembro, unlock }) => (
                  <div className="crew-preview-card-slot" key={miembro.id}>
                    <span className="crew-preview-unlock-label">{unlock}</span>
                    <CrewCard miembro={miembro} linkEnabled={false} />
                  </div>
                ))}
              </div>
            </section>

            <aside className="crew-preview-ticket">
              <strong>CREW TICKETS</strong>
              <span>0,1 ticket por cada euro completo pagado</span>
              <p>Gástalos en personajes y marcos. Tu nivel nunca baja.</p>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

function RewardVisual({ reward }) {
  if (reward.kind === 'frame') {
    return (
      <div className={`crew-frame-sample crew-frame-sample--${reward.id}`} aria-hidden="true">
        <span>035</span>
      </div>
    );
  }
  return <img src={getCrewAvatarImage(reward.id)} alt="" className="neon-art" />;
}

function RewardCard({ reward, ticketBalance, busy, onEquip, onRedeem }) {
  let action = null;
  if (reward.equipped) {
    action = <span className="crew-reward-state crew-reward-state--active">En uso</span>;
  } else if (reward.owned) {
    action = (
      <button
        type="button"
        className="btn btn--ghost crew-reward-button"
        disabled={busy}
        onClick={() => onEquip(reward.id)}
        aria-label={`Equipar ${reward.name}`}
      >
        {busy ? 'Guardando…' : 'Equipar'}
      </button>
    );
  } else if (reward.locked) {
    action = <span className="crew-reward-state">Se abre con {reward.requiredXp} XP</span>;
  } else if (reward.unlockMode === 'tickets') {
    const canAfford = ticketBalance >= reward.ticketCost;
    action = (
      <button
        type="button"
        className="btn btn--primary crew-reward-button"
        disabled={busy || !canAfford}
        onClick={() => onRedeem(reward.id)}
        aria-label={`Canjear ${reward.name}`}
      >
        {busy
          ? 'Canjeando…'
          : canAfford
            ? `${reward.ticketCost} tickets`
            : `Faltan ${(reward.ticketCost - ticketBalance).toFixed(1)}`}
      </button>
    );
  }

  return (
    <article className={`crew-reward-card ${reward.locked ? 'crew-reward-card--locked' : ''}`}>
      <div className="crew-reward-visual">
        <RewardVisual reward={reward} />
        {reward.owned && <span className="crew-owned-stamp">TUYO</span>}
      </div>
      <div className="crew-reward-copy">
        <span className="crew-reward-type">{reward.kind === 'frame' ? 'MARCO' : 'PERSONAJE'}</span>
        <h3>{reward.name}</h3>
        <p>{reward.description}</p>
        {action}
      </div>
    </article>
  );
}

export default function CrewProfile({
  accountEnabled = false,
  account = { loggedIn: false, customer: null },
  onLogout,
  onAvatarChange,
  crewProfile: sharedProfile = null,
}) {
  const [busyRewardId, setBusyRewardId] = useState('');
  const [error, setError] = useState('');

  const isLoggedIn = accountEnabled && account.loggedIn;

  /* El perfil lo trae la tienda (un solo fetch por sesión); si nadie lo pasa,
     esta página lo pide ella misma. */
  const ownProfile = useCrewProfile({ enabled: isLoggedIn && !sharedProfile });
  const crew = sharedProfile ?? ownProfile;
  const { profile, loading } = crew;

  useEffect(() => {
    if (profile?.equippedAvatarId) onAvatarChange?.(profile.equippedAvatarId);
  }, [profile?.equippedAvatarId, onAvatarChange]);

  const currentAvatar = useMemo(
    () => profile?.rewards.find((reward) => reward.id === profile.equippedAvatarId),
    [profile]
  );

  async function mutateReward(rewardId, action) {
    setBusyRewardId(rewardId);
    setError('');
    try {
      const response = await action();
      crew.applyProfile(response.profile);
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setBusyRewardId('');
    }
  }

  async function handleLogout() {
    try {
      const logoutUrl = await onLogout?.();
      if (logoutUrl) window.location.assign(logoutUrl);
    } catch (requestError) {
      setError(errorText(requestError));
    }
  }

  if (!isLoggedIn) return <CrewGate accountEnabled={accountEnabled} />;

  if (loading || !profile) {
    return (
      <section className="crew-profile-page crew-profile-loading" aria-live="polite">
        <span className="crew-loading-mark">035</span>
        <p>{error || crew.error || 'Abriendo tu taquilla de la Crew…'}</p>
      </section>
    );
  }

  const avatarRewards = profile.rewards.filter(
    (reward) => reward.kind === 'avatar' && (reward.unlockMode === 'level' || reward.owned)
  );
  const ticketRewards = profile.rewards.filter((reward) => reward.unlockMode === 'tickets');
  const nextXp = profile.level.nextXp;

  return (
    <div className="crew-profile-page">
      <header className="crew-profile-header">
        <div>
          <span className="crew-kicker">CARNET OFICIAL · ROCKY 035</span>
          <h1 className="page-title">{profile.displayName}</h1>
          <p>Tu colección, tus escalones y tus tickets. Todo lo que has movido con la banda.</p>
        </div>
        <button type="button" className="crew-logout" onClick={handleLogout}>
          Salir de la cuenta
        </button>
      </header>

      {error && (
        <div className="crew-profile-error" role="alert">
          {error}
        </div>
      )}

      <div className="crew-profile-dashboard">
        <aside className="crew-id-card">
          <span className="crew-id-card__serial">MEMBER // 035</span>
          <div
            className={`crew-current-avatar ${profile.equippedFrameId ? `crew-current-avatar--${profile.equippedFrameId}` : ''}`}
          >
            <img
              src={getCrewAvatarImage(profile.equippedAvatarId)}
              alt={`Avatar ${currentAvatar?.name || 'ROCKY'}`}
              className="neon-art"
            />
          </div>
          <span className="crew-id-card__level">{profile.level.name}</span>
          <strong>{profile.displayName}</strong>
          <p>{profile.collectionCount} piezas en la taquilla</p>
        </aside>

        <div className="crew-profile-content">
          <section className="crew-progress-panel" aria-labelledby="crew-progress-title">
            <CrewCornerCharacter />
            <div className="crew-progress-copy">
              <div>
                <span className="crew-section-label">TU ESCALÓN</span>
                <h2 id="crew-progress-title">{profile.level.name}</h2>
              </div>
              <strong>
                {nextXp ? `${profile.xp} / ${nextXp} XP` : `${profile.xp} XP · MÁXIMO`}
              </strong>
            </div>
            <div
              className="crew-progress-track"
              aria-label={`${profile.level.progress}% completado`}
            >
              <span style={{ '--crew-progress-ratio': profile.level.progress / 100 }} />
            </div>
            <p>
              {profile.level.nextLevelName
                ? `Siguiente parada: ${profile.level.nextLevelName}. Te faltan ${nextXp - profile.xp} XP.`
                : 'Has llegado al último escalón. Leyenda de la colmena.'}
            </p>
          </section>

          <section className="crew-stat-grid" aria-label="Resumen Crew">
            <article className="crew-stat crew-stat--tickets">
              <span className="kicker">PARA GASTAR</span>
              <strong>{profile.ticketBalance} Crew Tickets</strong>
              <p>Tu nivel no baja cuando los usas.</p>
            </article>
            <article className="crew-stat">
              <span className="kicker">XP HISTÓRICO</span>
              <strong>{profile.xp}</strong>
              <p>La huella de todo lo que llevas.</p>
            </article>
            <article className="crew-stat">
              <span className="kicker">COLECCIÓN</span>
              <strong>{profile.collectionCount}</strong>
              <p>Personajes, marcos y rarezas.</p>
            </article>
          </section>

          <section className="crew-section" aria-labelledby="crew-locker-title">
            <div className="crew-section-heading">
              <div>
                <span className="crew-section-label">TU TAQUILLA</span>
                <h2 id="crew-locker-title">Personajes</h2>
              </div>
              <p>Sube de nivel o canjea tickets. Luego elige quién eres hoy.</p>
            </div>
            <div className="crew-reward-grid">
              {avatarRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  ticketBalance={profile.ticketBalance}
                  busy={busyRewardId === reward.id}
                  onEquip={(rewardId) => mutateReward(rewardId, () => equipCrewReward(rewardId))}
                  onRedeem={(rewardId) =>
                    mutateReward(rewardId, () => redeemCrewReward({ rewardId }))
                  }
                />
              ))}
            </div>
          </section>

          <section className="crew-section crew-ticket-shop" aria-labelledby="crew-shop-title">
            <div className="crew-section-heading">
              <div>
                <span className="crew-section-label">ZONA DE TICKETS</span>
                <h2 id="crew-shop-title">Pilla algo raro</h2>
              </div>
              <p>
                Saldo actual: <strong>{profile.ticketBalance} tickets</strong>
              </p>
            </div>
            <div className="crew-reward-grid">
              {ticketRewards.map((reward) => (
                <RewardCard
                  key={`shop-${reward.id}`}
                  reward={reward}
                  ticketBalance={profile.ticketBalance}
                  busy={busyRewardId === reward.id}
                  onEquip={(rewardId) => mutateReward(rewardId, () => equipCrewReward(rewardId))}
                  onRedeem={(rewardId) =>
                    mutateReward(rewardId, () => redeemCrewReward({ rewardId }))
                  }
                />
              ))}
            </div>
          </section>

          <section className="crew-section" aria-labelledby="crew-history-title">
            <div className="crew-section-heading">
              <div>
                <span className="crew-section-label">TU HUELLA</span>
                <h2 id="crew-history-title">Compras acreditadas</h2>
              </div>
            </div>
            {profile.purchases.length ? (
              <div className="crew-purchase-list">
                {profile.purchases.map((purchase) => (
                  <article key={`${purchase.orderName}-${purchase.processedAt || purchase.amount}`}>
                    <div>
                      <strong>{purchase.orderName}</strong>
                      <span>{formatDate(purchase.processedAt)}</span>
                    </div>
                    <p>{purchase.items.join(' · ') || 'Pedido ROCKY'}</p>
                    <div className="crew-purchase-rewards">
                      <span>+{purchase.xpEarned} XP</span>
                      <span>+{purchase.ticketsEarned} tickets</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="crew-empty-history">Tu primer pedido abrirá esta libreta.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
