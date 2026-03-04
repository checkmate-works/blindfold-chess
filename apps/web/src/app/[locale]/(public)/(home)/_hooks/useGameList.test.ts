import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Game, GameSortOption, SortDirection } from '@/lib/types';

import { useGameList } from './useGameList';

// Mock LocalStorageGameRepository
const mockLoadAllSorted = vi.fn();

vi.mock('@/lib/repositories', () => ({
  LocalStorageGameRepository: vi.fn(function () {
    return {
      loadAllSorted: mockLoadAllSorted,
    };
  }),
}));

describe('useGameList', () => {
  let mockGames: Game[];

  beforeEach(() => {
    // Setup mock games data
    mockGames = [
      {
        id: 'game-1',
        date: new Date('2024-01-01').toISOString(),
        lastPlayed: new Date('2024-01-02').toISOString(),
        moves: [],
        playerColor: 'white',
        skillLevel: 1,
        status: 'in_progress',
      },
      {
        id: 'game-2',
        date: new Date('2024-01-03').toISOString(),
        lastPlayed: new Date('2024-01-04').toISOString(),
        moves: [],
        playerColor: 'black',
        skillLevel: 5,
        status: 'in_progress',
      },
    ];

    mockLoadAllSorted.mockResolvedValue(mockGames);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial load', () => {
    it('should start with loading state and load games on mount', async () => {
      const { result } = renderHook(() => useGameList('lastPlayed', 'desc'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.games).toEqual([]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.games).toEqual(mockGames);
      expect(mockLoadAllSorted).toHaveBeenCalledWith('lastPlayed', 'desc');
    });

    it('should handle loading errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLoadAllSorted.mockRejectedValueOnce(new Error('Failed to load'));

      const { result } = renderHook(() => useGameList('lastPlayed', 'desc'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.games).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load games:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Sort parameter changes', () => {
    it('should reload games when sortBy changes', async () => {
      const { result, rerender } = renderHook(
        ({ sortBy, sortDirection }: { sortBy: GameSortOption; sortDirection: SortDirection }) =>
          useGameList(sortBy, sortDirection),
        {
          initialProps: {
            sortBy: 'lastPlayed' as GameSortOption,
            sortDirection: 'desc' as SortDirection,
          },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLoadAllSorted).toHaveBeenCalledTimes(1);
      expect(mockLoadAllSorted).toHaveBeenLastCalledWith('lastPlayed', 'desc');

      // Change sortBy
      rerender({ sortBy: 'created' as GameSortOption, sortDirection: 'desc' as SortDirection });

      await waitFor(() => {
        expect(mockLoadAllSorted).toHaveBeenCalledTimes(2);
      });

      expect(mockLoadAllSorted).toHaveBeenLastCalledWith('created', 'desc');
    });

    it('should reload games when sortDirection changes', async () => {
      const { result, rerender } = renderHook(
        ({ sortBy, sortDirection }: { sortBy: GameSortOption; sortDirection: SortDirection }) =>
          useGameList(sortBy, sortDirection),
        {
          initialProps: {
            sortBy: 'lastPlayed' as GameSortOption,
            sortDirection: 'desc' as SortDirection,
          },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLoadAllSorted).toHaveBeenCalledTimes(1);

      // Change sortDirection
      rerender({ sortBy: 'lastPlayed' as GameSortOption, sortDirection: 'asc' as SortDirection });

      await waitFor(() => {
        expect(mockLoadAllSorted).toHaveBeenCalledTimes(2);
      });

      expect(mockLoadAllSorted).toHaveBeenLastCalledWith('lastPlayed', 'asc');
    });
  });

  describe('reloadGames function', () => {
    it('should reload games when reloadGames is called manually', async () => {
      const { result } = renderHook(() => useGameList('lastPlayed', 'desc'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLoadAllSorted).toHaveBeenCalledTimes(1);

      // Manually trigger reload
      await waitFor(async () => {
        await result.current.reloadGames();
      });

      expect(mockLoadAllSorted).toHaveBeenCalledTimes(2);
    });

    it('should set loading state during manual reload', async () => {
      const { result } = renderHook(() => useGameList('lastPlayed', 'desc'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Create a delayed promise
      let resolveLoad!: (value: Game[]) => void;
      const loadPromise = new Promise<Game[]>((resolve) => {
        resolveLoad = resolve;
      });

      mockLoadAllSorted.mockReturnValueOnce(loadPromise);

      // Start reload (don't await)
      const reloadPromise = result.current.reloadGames();

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the load
      await waitFor(() => {
        resolveLoad(mockGames);
      });
      await reloadPromise;

      // Should no longer be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
