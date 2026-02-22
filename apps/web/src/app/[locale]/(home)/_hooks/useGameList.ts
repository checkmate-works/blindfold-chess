import { useCallback, useEffect, useState } from 'react';

import { GAME_UPDATED_EVENT } from '@/config';

import { LocalStorageGameRepository } from '@/lib/repositories';
import type { Game, GameSortOption, SortDirection } from '@/lib/types';

type Return = {
  games: Game[];
  isLoading: boolean;
  reloadGames: () => Promise<void>;
};

/**
 * Custom hook for managing game list state with localStorage synchronization
 *
 * Features:
 * - Loads games from localStorage sorted by specified criteria
 * - Listens for custom events for same-tab update notifications
 * - Automatically reloads when sort parameters change
 *
 * @param sortBy - Sort column (e.g., 'lastPlayed', 'createdAt')
 * @param sortDirection - Sort direction ('asc' or 'desc')
 * @returns Object containing games array, loading state, and reload function
 */
export function useGameList(sortBy: GameSortOption, sortDirection: SortDirection): Return {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadGames = useCallback(async () => {
    setIsLoading(true);
    try {
      const gameRepository = new LocalStorageGameRepository();
      const savedGames = await gameRepository.loadAllSorted(sortBy, sortDirection);
      setGames(savedGames);
    } catch (error) {
      console.error('Failed to load games:', error);
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, sortDirection]);

  useEffect(() => {
    loadGames();

    // Listen for same-tab game update notifications via custom event
    const handleGameUpdated = () => {
      loadGames();
    };

    window.addEventListener(GAME_UPDATED_EVENT, handleGameUpdated);

    return () => {
      window.removeEventListener(GAME_UPDATED_EVENT, handleGameUpdated);
    };
  }, [loadGames]);

  return {
    games,
    isLoading,
    reloadGames: loadGames,
  };
}
