'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

import type { GameSortOption, SortDirection } from '@/lib/types';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import type { Locale } from '@/app/[locale]/_lib/types';

import { EmptyGameList } from '../../(home)/_components/EmptyGameList';
import { GameList } from '../../(home)/_components/GameList';
import { GameListSkeleton } from '../../(home)/_components/GameListSkeleton';
import { useGameDelete } from '../../(home)/_hooks/useGameDelete';
import { useGameList } from '../../(home)/_hooks/useGameList';
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

  const { games, isLoading } = useGameList(sortBy, sortDirection);

  const displayGames = games.slice(0, GAMES_PAGE_MAX_COUNT);

  const handleSortChange = (value: string) => {
    const [column, direction] = value.split('-') as [GameSortOption, SortDirection];
    setSortBy(column);
    setSortDirection(direction);
  };

  return (
    <>
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
          <GameList games={displayGames} locale={locale} onDeleteGame={handleDeleteGame} />
          <div className="mt-4 text-right">
            <Link
              href="/games/bulk-delete"
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              {t('bulkDelete')}
            </Link>
          </div>
        </>
      )}

      <ConfirmationModal {...confirmationModalProps} />
    </>
  );
}
