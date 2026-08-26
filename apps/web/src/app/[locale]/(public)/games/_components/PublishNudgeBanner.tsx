'use client';

import { useMemo } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { classifyGuestPromotionQualification } from '@/lib/games/guest-promotion';
import { getSharedGame } from '@/lib/games/shared-game-store';

import { usePromotionTarget } from '@/app/[locale]/(public)/games/_hooks/use-promotion-target';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useGameList } from '../../(home)/_hooks/use-game-list';

type Props = {
  locale: Locale;
  /** Extra classes on the banner root (e.g. page-specific margins). Applied
   *  only when the banner actually renders — a hidden banner leaves no DOM. */
  className?: string;
};

/**
 * The catch-all end of the sign-up funnel, shown on /games and /dojo: a
 * signed-in player may hold finished, unpublished games whose settings
 * already satisfy the 1kyu/1dan game requirement (played as a guest — the
 * sign-up CTA deliberately carries no post-registration hand-off). Ranks
 * grant independently, so publishing one promotes them on the spot; this
 * banner surfaces the best such game with a CTA to its publish form.
 *
 * The promise is validated per-user, not just per-game: the best game's
 * qualification is routed through `usePromotionTarget` (the same promise
 * the finish modal makes via `usePublishPromotion`), so a player who
 * already holds the rank is never promised it again — the wording
 * downgrades to 1kyu for dan holders and the banner hides entirely when
 * nothing would be granted. That hook is itself auth-gated (skips the
 * round-trip and stays null for guests and provisional users), so this
 * component needs no auth check of its own.
 *
 * Renders nothing when there is nothing to say — pages can mount it
 * unconditionally.
 */
export function PublishNudgeBanner({ locale, className }: Props) {
  const t = useTranslations('home.gameList');
  const { games, isLoading } = useGameList('lastPlayed', 'desc');

  const publishNudge = useMemo(() => {
    let best: { gameId: string; qualification: '1kyu' | '1dan' } | null = null;
    for (const game of games) {
      if (game.status === 'in_progress') continue;
      if (getSharedGame(game.id) !== null) continue;
      const qualification = classifyGuestPromotionQualification({
        result: game.status,
        playSettings: game.gamePreferences,
        changeLog: game.preferenceChangeLog,
        operationLogs: game.operationLogs,
        operationTotals: game.operationTotals,
        moveCount: game.moves.length,
        startingFen: game.startingFen,
        setupPlies: game.setupPlies,
      });
      if (!qualification) continue;
      if (qualification === '1dan') return { gameId: game.id, qualification };
      best ??= { gameId: game.id, qualification };
    }
    return best;
  }, [games]);

  const nudgeRank = usePromotionTarget(publishNudge?.qualification ?? null);

  if (isLoading || publishNudge === null || nudgeRank === null) return null;

  return (
    <div
      className={[
        'rounded-lg bg-amber-50 p-3 text-sm text-foreground/80 dark:bg-amber-950/20',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p>{nudgeRank === '1dan' ? t('publishNudge.body1dan') : t('publishNudge.body1kyu')}</p>
      <div className="mt-1 flex justify-center">
        <Link
          href={`/games/shared/new?gameId=${publishNudge.gameId}`}
          locale={locale}
          className={`font-medium ${TEXT_LINK_CLASSES}`}
        >
          {t('publishNudge.cta')}
        </Link>
      </div>
    </div>
  );
}
