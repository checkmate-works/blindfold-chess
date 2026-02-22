'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { notifyGameListUpdated } from '@/config';

import { LocalStorageGameRepository } from '@/lib/repositories';
import type { GameSortOption, SortDirection } from '@/lib/types';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useGameList } from '../_hooks/useGameList';
import { EmptyGameList } from './EmptyGameList';
import { GameList } from './GameList';
import { GameListSkeleton } from './GameListSkeleton';
import { SortButton } from './SortButton';

type Props = {
  locale: Locale;
};

export function GameListClient({ locale }: Props) {
  const t = useTranslations('home');
  const tGameList = useTranslations('home.gameList');
  const { showToast } = useToast();
  const [sortBy, setSortBy] = useState<GameSortOption>('lastPlayed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteConfirmGameId, setDeleteConfirmGameId] = useState<string | null>(null);

  const { games, isLoading } = useGameList(sortBy, sortDirection);

  const handleDeleteGame = (gameId: string) => {
    setDeleteConfirmGameId(gameId);
  };

  const confirmDeleteGame = async () => {
    if (!deleteConfirmGameId) return;

    const gameRepository = new LocalStorageGameRepository();

    try {
      await gameRepository.delete(deleteConfirmGameId);
      notifyGameListUpdated();
      showToast(t('gameDeletedToast'), 'success');
    } catch (error) {
      console.error('Failed to delete game:', error);
      showToast(t('deleteFailedToast'), 'error');
    } finally {
      setDeleteConfirmGameId(null);
    }
  };

  const handleSortChange = (value: string) => {
    const [column, direction] = value.split('-') as [GameSortOption, SortDirection];
    setSortBy(column);
    setSortDirection(direction);
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle className="!mb-0 !text-left">{tGameList('title')}</PageTitle>
        {!isLoading && games.length > 0 && (
          <SortButton
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
        )}
      </div>

      {isLoading ? (
        <GameListSkeleton />
      ) : games.length === 0 ? (
        <EmptyGameList locale={locale} />
      ) : (
        <>
          <GameList games={games} locale={locale} onDeleteGame={handleDeleteGame} />
          <div className="mt-4 text-right">
            <Link
              href={`/${locale}/games/bulk-delete`}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              {tGameList('bulkDelete')}
            </Link>
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmGameId !== null}
        title={t('deleteGameTitle')}
        message={t('deleteGameMessage')}
        confirmText={t('deleteConfirm')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        onConfirm={confirmDeleteGame}
        onCancel={() => setDeleteConfirmGameId(null)}
      />
    </>
  );
}
