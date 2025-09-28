'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { LocalStorageGameRepository } from '@/lib/repositories';
import type { Game, GameSortOption, SortDirection } from '@/lib/types';
import { GameList } from './GameList';
import { EmptyGameList } from './EmptyGameList';
import { GameListSkeleton } from './GameListSkeleton';
import { SortButton } from './SortButton';
import { ConfirmationModal } from '../../_components/ConfirmationModal';
import { PageTitle } from '../../_components/PageTitle';
import { useToast } from '../../_contexts/ToastContext';
import type { Locale } from '../../_lib/types';

type Props = {
  locale: Locale;
};

export function GameListClient({ locale }: Props) {
  const t = useTranslations('home');
  const tGameList = useTranslations('home.gameList');
  const { showToast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<GameSortOption>('lastPlayed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteConfirmGameId, setDeleteConfirmGameId] = useState<string | null>(null);

  useEffect(() => {
    const gameRepository = new LocalStorageGameRepository();

    const loadGames = async () => {
      setIsLoading(true);
      try {
        const savedGames = await gameRepository.loadAllSorted(sortBy, sortDirection);
        setGames(savedGames);
      } catch (error) {
        console.error('Failed to load games:', error);
        setGames([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadGames();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'blindfold_chess_game_updated') {
        loadGames();
      }
    };

    const checkSessionStorage = () => {
      const updated = sessionStorage.getItem('blindfold_chess_game_updated');
      if (updated) {
        sessionStorage.removeItem('blindfold_chess_game_updated');
        loadGames();
      }
    };

    const interval = setInterval(checkSessionStorage, 1000);

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [sortBy, sortDirection]);

  const handleDeleteGame = (gameId: string) => {
    setDeleteConfirmGameId(gameId);
  };

  const confirmDeleteGame = async () => {
    if (!deleteConfirmGameId) return;

    const gameRepository = new LocalStorageGameRepository();

    try {
      await gameRepository.delete(deleteConfirmGameId);
      sessionStorage.setItem('blindfold_chess_game_updated', 'true');
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
        <PageTitle>{tGameList('title')}</PageTitle>
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
        <EmptyGameList />
      ) : (
        <GameList games={games} locale={locale} onDeleteGame={handleDeleteGame} />
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
