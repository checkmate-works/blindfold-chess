'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/app/_components';
import { GAME_LIMIT_WARNING_THRESHOLD, MAX_GAMES } from '@/config';
import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaExclamationTriangle, FaPlus } from 'react-icons/fa';

import { classifyGuestPromotionQualification } from '@/lib/games/guest-promotion';
import type { GameSortOption, SortDirection } from '@/lib/games/saved-game-types';
import { getSharedGame } from '@/lib/games/shared-game-store';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import { TEXT_LINK_CLASSES, TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { EmptyGameList } from '../../(home)/_components/EmptyGameList';
import { GameList } from '../../(home)/_components/GameList';
import { GameListSkeleton } from '../../(home)/_components/GameListSkeleton';
import { useGameDelete } from '../../(home)/_hooks/use-game-delete';
import { useGameList } from '../../(home)/_hooks/use-game-list';
import { SortButton } from './SortButton';

const GAMES_PAGE_MAX_COUNT = 20;

type Props = {
  locale: Locale;
};

export function GamesPageClient({ locale }: Props) {
  const t = useTranslations('home.gameList');
  const [sortBy, setSortBy] = useState<GameSortOption>('lastPlayed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { handleDeleteGame, confirmationModalProps } = useGameDelete();
  const { user, hasProfile, isLoading: isAuthLoading } = useAuth();

  const { games, isLoading } = useGameList(sortBy, sortDirection);

  const displayGames = games.slice(0, GAMES_PAGE_MAX_COUNT);
  const remainingSlots = MAX_GAMES - games.length;
  const showLimitWarning = !isLoading && remainingSlots <= GAME_LIMIT_WARNING_THRESHOLD;
  const isAtLimit = !isLoading && remainingSlots <= 0;

  // The catch-all end of the sign-up funnel: a signed-in player may hold
  // finished, unpublished games whose settings already satisfy the 1kyu/1dan
  // game requirement (played as a guest, or the sign-up `next` hand-off was
  // interrupted). Ranks grant independently, so publishing one promotes them
  // on the spot — surface the best such game. Guests are excluded: their
  // pitch lives in the finish modal and the shared-game claim banner.
  const publishNudge = useMemo(() => {
    if (user == null || !hasProfile) return null;
    let best: { gameId: string; qualification: '1kyu' | '1dan' } | null = null;
    for (const game of games) {
      if (game.status === 'in_progress') continue;
      if (getSharedGame(game.id) !== null) continue;
      const qualification = classifyGuestPromotionQualification({
        result: game.status,
        playSettings: game.gamePreferences,
        changeLog: game.preferenceChangeLog,
        operationLogs: game.operationLogs,
        moveCount: game.moves.length,
      });
      if (!qualification) continue;
      if (qualification === '1dan') return { gameId: game.id, qualification };
      best ??= { gameId: game.id, qualification };
    }
    return best;
  }, [games, user, hasProfile]);
  const showPublishNudge = !isLoading && !isAuthLoading && publishNudge !== null;

  const handleSortChange = (value: string) => {
    const [column, direction] = value.split('-') as [GameSortOption, SortDirection];
    setSortBy(column);
    setSortDirection(direction);
  };

  return (
    <>
      {showPublishNudge && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-foreground/80 dark:bg-amber-950/20">
          <p>
            {publishNudge.qualification === '1dan'
              ? t('publishNudge.body1dan')
              : t('publishNudge.body1kyu')}
          </p>
          <Link
            href={`/games/shared/new?gameId=${publishNudge.gameId}`}
            locale={locale}
            className={`mt-1 inline-block font-medium ${TEXT_LINK_CLASSES}`}
          >
            {t('publishNudge.cta')}
          </Link>
        </div>
      )}

      {showLimitWarning && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-foreground/80 dark:bg-amber-950/20">
          <FaExclamationTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500"
            aria-hidden
          />
          <span>
            {t.rich('limitWarning', {
              remaining: remainingSlots,
              max: MAX_GAMES,
              link: (chunks) => (
                <Link
                  href="/games/bulk-delete"
                  locale={locale}
                  className={`font-medium ${TEXT_LINK_CLASSES}`}
                >
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </div>
      )}

      <div data-tour-id="games-new-button">
        {isAtLimit ? (
          <Button
            variant="primary"
            size="lg"
            icon={<FaPlus className="w-5 h-5" />}
            className="w-full touch-manipulation"
            disabled
          >
            {t('newGame')}
          </Button>
        ) : (
          <Link href="/games/new" locale={locale} className="block w-full">
            <Button
              variant="primary"
              size="lg"
              icon={<FaPlus className="w-5 h-5" />}
              className="w-full touch-manipulation"
            >
              {t('newGame')}
            </Button>
          </Link>
        )}
      </div>

      {!isLoading && games.length > 0 && (
        <div className="flex justify-end">
          <SortButton
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
        </div>
      )}

      {isLoading ? (
        <>
          <div className="flex justify-end">
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-5 h-5 bg-muted rounded" />
              <div className="h-9 w-40 bg-muted rounded-md" />
            </div>
          </div>
          <GameListSkeleton rows={10} />
          <div className="mt-4 text-right animate-pulse">
            <div className="inline-block h-4 w-24 bg-muted rounded" />
          </div>
        </>
      ) : games.length === 0 ? (
        <EmptyGameList locale={locale} />
      ) : (
        <>
          <div data-tour-id="games-list">
            <GameList games={displayGames} locale={locale} onDeleteGame={handleDeleteGame} />
          </div>
          <div className="mt-4 text-right">
            <Link
              href="/games/bulk-delete"
              locale={locale}
              className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}
              data-tour-id="games-bulk-delete"
            >
              {t('bulkDelete')}
            </Link>
          </div>
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950/20">
            <Link
              href="/ranks"
              locale={locale}
              className="text-sm text-foreground/80 hover:text-foreground underline"
            >
              {t('ranksLink')}
            </Link>
          </div>
        </>
      )}

      <ConfirmationModal {...confirmationModalProps} />
    </>
  );
}
