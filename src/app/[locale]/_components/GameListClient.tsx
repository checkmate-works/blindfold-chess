'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Game,
  LocalStorageGameRepository,
  GameSortOption,
  SortDirection,
} from '../play/_lib/game-repository';
import { GameList } from './GameList';
import { NewGameCard } from './NewGameCard';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from '../_contexts/ToastContext';
import type { Locale } from '../_lib/types';

interface GameListClientProps {
  locale: Locale;
}

const MAX_GAMES = 50; // Maximum number of games to keep

export function GameListClient({ locale }: GameListClientProps) {
  const t = useTranslations('home');
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<GameSortOption>('lastPlayed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteConfirmGameId, setDeleteConfirmGameId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const gameRepository = new LocalStorageGameRepository();

    // Load games from repository
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

    // Listen for game updates from other tabs/components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'blindfold_chess_game_updated') {
        loadGames();
      }
    };

    // Also listen for session storage changes (for within-tab updates)
    const checkSessionStorage = () => {
      const updated = sessionStorage.getItem('blindfold_chess_game_updated');
      if (updated) {
        sessionStorage.removeItem('blindfold_chess_game_updated');
        loadGames();
      }
    };

    // Check session storage periodically
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
      setGames((prevGames) => prevGames.filter((game) => game.id !== deleteConfirmGameId));
      showToast(t('gameDeletedToast'), 'success');
    } catch (error) {
      console.error('Failed to delete game:', error);
      showToast(t('deleteFailedToast'), 'error');
    } finally {
      setDeleteConfirmGameId(null);
    }
  };

  const isGameLimitReached = games.length >= MAX_GAMES;

  const handleSortChange = (value: string) => {
    const [column, direction] = value.split('-') as [GameSortOption, SortDirection];
    setSortBy(column);
    setSortDirection(direction);
  };

  return (
    <div className="space-y-6">
      <NewGameCard
        locale={locale}
        disabled={isGameLimitReached}
        translations={{
          newGame: t('newGame'),
          newGameDescription: t('newGameDescription'),
          playAsWhite: t('playAsWhite'),
          playAsBlack: t('playAsBlack'),
          vsComputer: t('vsComputer'),
          maxGamesReached: t('maxGamesReached', { max: 50 }),
        }}
      />

      {isLoading ? (
        <div className="bg-card rounded-2xl border border-border p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      ) : (
        <GameList
          games={games}
          locale={locale}
          onDeleteGame={handleDeleteGame}
          sortControls={
            games.length > 0 ? (
              <div className="flex items-center gap-3">
                <label
                  htmlFor="sort-select"
                  className="text-muted-foreground"
                  aria-label={t('sortBy')}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M3 6h18M7 12h10M11 18h2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </label>
                <select
                  id="sort-select"
                  value={`${sortBy}-${sortDirection}`}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="text-sm bg-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-foreground/20 text-foreground cursor-pointer hover:border-muted-foreground transition-colors"
                >
                  <option value="lastPlayed-desc">{t('lastPlayedDesc')}</option>
                  <option value="lastPlayed-asc">{t('lastPlayedAsc')}</option>
                  <option value="created-desc">{t('createdDesc')}</option>
                  <option value="created-asc">{t('createdAsc')}</option>
                </select>
              </div>
            ) : null
          }
        />
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
    </div>
  );
}
