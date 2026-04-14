import { useEffect, useState } from 'react';

import type { GameStatus } from '@blindfold-chess/features/ai-game';
import { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { LocalStorageGameRepository } from '@/lib/repositories';
import type { MoveOperationLog } from '@/lib/types';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { SESSION_STORAGE_KEYS } from '../_lib/session-storage-keys';

type SavedGameData = {
  moves: AlgebraicNotation[];
  startingFen?: string;
  lastMove: { from: string; to: string } | null;
  gameStatus: GameStatus;
  playerResult: 'win' | 'loss' | 'draw' | null;
  shouldMakeAiMove: boolean;
  gamePreferences?: PerGamePreferences;
  operationLogs?: MoveOperationLog[];
};

type UseGamePersistenceOptions = {
  initialGameId?: string;
  initialStartingFen?: string;
};

type UseGamePersistenceReturn = {
  isLoadingFromStorage: boolean;
  savedGameStatus: 'in_progress' | 'win' | 'loss' | 'draw' | null;
  loadedGameData: SavedGameData | null;
  gameNotFound: boolean;
};

/**
 * Hook for loading saved game data from localStorage.
 *
 * Consolidates:
 * - savedGameStatus state
 * - isLoadingFromStorage state
 * - Load saved game status effect
 * - Clear save toast flag effect
 * - Load full game from localStorage effect
 */
export function useGamePersistence({
  initialGameId,
  initialStartingFen,
}: UseGamePersistenceOptions): UseGamePersistenceReturn {
  const [isLoadingFromStorage, setIsLoadingFromStorage] = useState(!!initialGameId);
  const [savedGameStatus, setSavedGameStatus] = useState<
    'in_progress' | 'win' | 'loss' | 'draw' | null
  >(null);
  const [loadedGameData, setLoadedGameData] = useState<SavedGameData | null>(null);
  const [gameNotFound, setGameNotFound] = useState(false);

  // Load saved game status if gameId exists
  useEffect(() => {
    const loadSavedGameStatus = async () => {
      if (initialGameId) {
        const gameRepository = new LocalStorageGameRepository();
        const savedGame = await gameRepository.load(initialGameId);
        if (savedGame) {
          setSavedGameStatus(savedGame.status);
        }
      }
    };
    loadSavedGameStatus();
  }, [initialGameId]);

  // Clear save toast flag on mount when we have a gameId
  useEffect(() => {
    if (initialGameId && typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.SHOW_SAVE_TOAST);
    }
  }, [initialGameId]);

  // Load moves from localStorage on client-side
  useEffect(() => {
    const loadGame = async () => {
      if (initialGameId && typeof window !== 'undefined') {
        setIsLoadingFromStorage(true);
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.SHOW_SAVE_TOAST);

        const gameRepository = new LocalStorageGameRepository();
        const savedGame = await gameRepository.load(initialGameId);

        if (savedGame) {
          const moves = (savedGame.moves ?? []) as AlgebraicNotation[];
          const startingFen = savedGame.startingFen ?? initialStartingFen;
          const lastMove =
            moves.length > 0 ? getLastMoveDetails(moves as string[], savedGame.startingFen) : null;

          let gameStatus: GameStatus = 'in_progress';
          let playerResult: 'win' | 'loss' | 'draw' | null = null;
          let shouldMakeAiMove = true;

          if (savedGame.status && savedGame.status !== 'in_progress') {
            setSavedGameStatus(savedGame.status);
            if (savedGame.status === 'loss') {
              gameStatus = 'checkmate';
              playerResult = 'loss';
            } else if (savedGame.status === 'win') {
              gameStatus = 'checkmate';
              playerResult = 'win';
            } else if (savedGame.status === 'draw') {
              gameStatus = 'draw';
              playerResult = 'draw';
            }
            shouldMakeAiMove = false;
          }

          setLoadedGameData({
            moves,
            startingFen,
            lastMove,
            gameStatus,
            playerResult,
            shouldMakeAiMove,
            gamePreferences: savedGame.gamePreferences,
            operationLogs: savedGame.operationLogs,
          });
        } else {
          setGameNotFound(true);
        }

        setIsLoadingFromStorage(false);
      }
    };

    loadGame();
  }, [initialGameId, initialStartingFen]);

  return {
    isLoadingFromStorage,
    savedGameStatus,
    loadedGameData,
    gameNotFound,
  };
}
