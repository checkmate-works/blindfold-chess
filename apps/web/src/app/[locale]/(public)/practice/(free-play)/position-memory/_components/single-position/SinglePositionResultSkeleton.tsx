'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

import { SinglePositionResultPanelSkeleton } from './SinglePositionResultPanelSkeleton';

type Props = {
  /** Whether this flow earns EXP (single `[id]` = true, custom `[token]` = false). */
  grantsExp?: boolean;
};

/**
 * Inline finish fallback shown by the single / custom position-memory session
 * while the run is saved and the redirect to the result route is in flight.
 * It renders the SAME inner panel as the result route's server skeleton (both
 * share `SinglePositionResultPanelSkeleton`), so the session → result-loading →
 * result sequence stays on the board-comparison shape instead of flashing the
 * generic leaderboard-shaped `PracticeResultSkeleton` first.
 *
 * Rendered inside the session page's existing PageLayout panel, so it adds no
 * chrome of its own.
 */
export function SinglePositionResultSkeleton({ grantsExp = false }: Props) {
  const t = useTranslations('practice.positionMemory');
  const { user, isLoading } = useAuth();
  const authed = !isLoading && !!user;
  const anon = !isLoading && !user;

  return (
    <SinglePositionResultPanelSkeleton
      labels={{
        result: t('result'),
        original: t('original'),
        yourRecreation: t('yourRecreation'),
        requiredKnowledge: t('requiredKnowledge'),
      }}
      reserveExp={grantsExp && authed}
      reserveSignUpBanner={anon}
    />
  );
}
