'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useGameDelete } from '../_hooks/use-game-delete';
import { useGameList } from '../_hooks/use-game-list';
import { EmptyGameList } from './EmptyGameList';
import { GameList } from './GameList';
import { GameListSkeleton } from './GameListSkeleton';

const HOME_GAMES_DISPLAY_COUNT = 5;

type Props = {
  locale: Locale;
};

export function GameListClient({ locale }: Props) {
  const t = useTranslations('home.gameList');
  const { handleDeleteGame, confirmationModalProps } = useGameDelete();
  const { games, isLoading } = useGameList('lastPlayed', 'desc');

  const hasMore = games.length > HOME_GAMES_DISPLAY_COUNT;
  const displayGames = hasMore ? games.slice(0, HOME_GAMES_DISPLAY_COUNT) : games;

  return (
    <>
      {isLoading ? (
        <GameListSkeleton />
      ) : games.length === 0 ? (
        <EmptyGameList locale={locale} />
      ) : (
        <>
          <GameList games={displayGames} locale={locale} onDeleteGame={handleDeleteGame} />
          {hasMore && (
            <div className="text-center">
              <Link
                href="/games"
                locale={locale}
                className="text-sm text-link-primary hover:text-link-primary/80 transition-colors"
              >
                {t('moreGames')}
              </Link>
            </div>
          )}
        </>
      )}

      <ConfirmationModal {...confirmationModalProps} />
    </>
  );
}
