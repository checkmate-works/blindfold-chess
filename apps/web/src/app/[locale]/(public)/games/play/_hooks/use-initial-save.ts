import { useEffect, useRef } from 'react';

import { notifyGameListUpdated } from '@/config';

import { GameLimitError } from '@/lib/errors';
import type { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';

import type { GameDataRefs } from './use-auto-save';

type UseInitialSaveOptions = {
  saveOnInit: boolean;
  enabled: boolean;
  currentGameId: string | undefined;
  gameRepository: LocalStorageGameRepository;
  gameDataRefs: GameDataRefs;
  saveStateRefs: {
    lastSavedMovesLength: React.RefObject<number>;
    lastSavedStatus: React.RefObject<string>;
    hasSavedInSession: React.RefObject<boolean>;
  };
  setCurrentGameId: (id: string) => void;
  currentGameIdRef: React.RefObject<string | undefined>;
};

/**
 * Hook that handles the initial save when a new game is created.
 * Runs once on mount when saveOnInit is true and no gameId exists yet.
 */
export function useInitialSave({
  saveOnInit,
  enabled,
  currentGameId,
  gameRepository,
  gameDataRefs,
  saveStateRefs,
  setCurrentGameId,
  currentGameIdRef,
}: UseInitialSaveOptions) {
  const hasInitialSaveExecuted = useRef(false);

  useEffect(() => {
    if (saveOnInit && enabled && !currentGameId && !hasInitialSaveExecuted.current) {
      const performInitialSave = async () => {
        hasInitialSaveExecuted.current = true;

        try {
          const gameData = {
            moves: gameDataRefs.moves.current,
            playerColor: gameDataRefs.playerColor.current,
            engineConfig: gameDataRefs.engineConfig.current,
            status: gameDataRefs.status.current,
            startingFen: gameDataRefs.startingFen.current,
            gamePreferences: gameDataRefs.gamePreferences.current,
            preferenceChangeLog: gameDataRefs.preferenceChangeLog.current,
            operationLogs: gameDataRefs.operationLogs.current,
          };

          const savedGameId = await gameRepository.create(gameData);
          currentGameIdRef.current = savedGameId;
          setCurrentGameId(savedGameId);

          saveStateRefs.lastSavedMovesLength.current = gameDataRefs.moves.current.length;
          saveStateRefs.lastSavedStatus.current = gameDataRefs.status.current;
          saveStateRefs.hasSavedInSession.current = true;

          notifyGameListUpdated();
        } catch (error) {
          if (error instanceof GameLimitError) {
            console.warn('Game limit reached on initial save:', error.message);
            window.dispatchEvent(new Event('blindfold-chess:game-limit-start-error'));
          } else {
            console.error('Failed to save initial game state:', error);
          }
          hasInitialSaveExecuted.current = false;
        }
      };

      performInitialSave();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { hasInitialSaveExecuted };
}
