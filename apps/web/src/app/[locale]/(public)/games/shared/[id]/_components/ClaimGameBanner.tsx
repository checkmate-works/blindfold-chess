'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { clearManageToken, getSharedGameByPublishedId } from '@/lib/games/shared-game-store';

import { stashGrantedRanks } from '@/app/[locale]/(public)/practice/_lib/granted-ranks-stash';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

import { claimSharedGameAction } from '../_actions/claim-shared-game';

type Props = {
  /** Published game id (the URL id). */
  gameId: string;
  /** Whether the game has no registered author (`games.author_id IS NULL`). */
  isAuthorless: boolean;
  locale: string;
};

/**
 * The account-linking funnel for an anonymously published game, shown only
 * to the browser that holds its manage token:
 *
 * - Signed out: a sign-up CTA whose `next` returns here with `?claim=1`.
 * - Signed in (with a profile): a one-click "link to my account" button.
 * - Arriving with `?claim=1` (back from the sign-up funnel): the claim
 *   fires automatically, once — the closest thing to "publish and sign up
 *   in one motion" that an email-confirmation flow allows.
 *
 * On success the page fully reloads with `?toast=game_claimed`: the author
 * attribution and owner controls are server-rendered, and the already-mounted
 * RankAchievementModal only reads its stash on mount, so a soft refresh
 * would celebrate nothing if the claim cascaded a rank grant.
 *
 * Provisional viewers (signed in, no profile) see nothing — the auth guard
 * routes them through username setup, and the banner reappears after.
 */
export function ClaimGameBanner({ gameId, isAuthorless, locale }: Props) {
  const t = useTranslations('sharedGames');
  const { user, hasProfile, isLoading } = useAuth();
  const searchParams = useSearchParams();

  const [localGameId, setLocalGameId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoClaimAttemptedRef = useRef(false);

  useEffect(() => {
    const found = getSharedGameByPublishedId(gameId);
    if (found?.record.manageToken) {
      setLocalGameId(found.localGameId);
      setToken(found.record.manageToken);
    }
  }, [gameId]);

  const canClaim = isAuthorless && token != null && !isLoading && user != null && hasProfile;

  async function handleClaim() {
    if (!token || pending) return;
    setPending(true);
    setError(null);

    const res = await claimSharedGameAction(gameId, token);
    if (!res.success) {
      setPending(false);
      if (res.error === 'already_claimed') {
        // Claimed from another device/session — the token is spent either
        // way, so drop it and get out of the way without an error.
        if (localGameId) clearManageToken(localGameId);
        setDismissed(true);
        return;
      }
      setError(
        res.error === 'forbidden' ? t('detail.errors.forbidden') : t('detail.errors.generic')
      );
      return;
    }

    stashGrantedRanks(res.grantedRanks);
    if (localGameId) clearManageToken(localGameId);
    window.location.assign(`/${locale}/games/shared/${gameId}?toast=game_claimed`);
  }

  // Auto-claim exactly once when landing back from the sign-up funnel.
  const autoClaimRequested = searchParams.get('claim') === '1';
  useEffect(() => {
    if (!autoClaimRequested || !canClaim || autoClaimAttemptedRef.current) return;
    autoClaimAttemptedRef.current = true;
    void handleClaim();
    // handleClaim is stable enough for a fire-once effect; listing it would
    // re-arm the guard for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoClaimRequested, canClaim]);

  if (!isAuthorless || token == null || isLoading || dismissed) return null;
  if (user != null && !hasProfile) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      {user == null ? (
        <>
          <h3 className="text-sm font-semibold text-foreground">
            {t('detail.claim.signedOutTitle')}
          </h3>
          <p className="text-sm text-muted-foreground">{t('detail.claim.signedOutBody')}</p>
          <Link
            href={`/${locale}/sign-up?next=${encodeURIComponent(
              `/${locale}/games/shared/${gameId}?claim=1`
            )}`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('detail.claim.signUpCta')}
          </Link>
        </>
      ) : (
        <>
          <h3 className="text-sm font-semibold text-foreground">{t('detail.claim.claimTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('detail.claim.claimBody')}</p>
          <button
            type="button"
            onClick={handleClaim}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? t('detail.claim.claiming') : t('detail.claim.claimButton')}
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
