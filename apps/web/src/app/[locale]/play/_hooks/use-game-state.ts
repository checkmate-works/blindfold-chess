import { useCallback, useEffect, useState } from 'react';

import { GameStateService } from '@blindfold-chess/features/ai-game';
import type { GameStatus } from '@blindfold-chess/features/ai-game';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';
import { Chess } from 'chess.js';

type LoadedGameData = {
  startingFen?: string;
  moves: AlgebraicNotation[];
  lastMove: { from: string; to: string } | null;
  gameStatus: GameStatus;
  playerResult: 'win' | 'loss' | 'draw' | null;
};

type UseGameStateOptions = {
  playerSide: Side;
  startingFen: string | undefined;
  moves: AlgebraicNotation[];
  initialMovesFromUrl: AlgebraicNotation[];
  initialGameId: string | undefined;
  isLoadingFromStorage: boolean;
  savedGameStatus: string | null;
  loadedGameData: LoadedGameData | null;
  setMovesTo: (moves: AlgebraicNotation[]) => void;
  setStartingFen: (fen: string | undefined) => void;
};

export function useGameState({
  playerSide,
  startingFen,
  moves,
  initialMovesFromUrl,
  initialGameId,
  isLoadingFromStorage,
  savedGameStatus,
  loadedGameData,
  setMovesTo,
  setStartingFen,
}: UseGameStateOptions) {
  const [isPlayerTurn, setIsPlayerTurn] = useState(playerSide === 'white');
  const [gameStatus, setGameStatus] = useState<GameStatus>('in_progress');
  const [playerResult, setPlayerResult] = useState<'win' | 'loss' | 'draw' | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [shouldMakeAiMove, setShouldMakeAiMove] = useState(() => {
    if (initialGameId) {
      return false;
    }
    if (initialMovesFromUrl.length > 0) {
      const gameStateService = new GameStateService(initialMovesFromUrl, playerSide, startingFen);
      return !gameStateService.isPlayerTurn() && gameStateService.getGameStatus() === 'in_progress';
    }
    if (startingFen) {
      const fenParts = startingFen.split(' ');
      const turnFromFen = fenParts[1];
      const isWhiteToMove = turnFromFen === 'w';
      return (
        (playerSide === 'white' && !isWhiteToMove) || (playerSide === 'black' && isWhiteToMove)
      );
    }
    return playerSide === 'black';
  });

  // Helper function to get last move details
  const getLastMoveDetails = useCallback(
    (movesArray: AlgebraicNotation[], customFen?: string) => {
      if (movesArray.length === 0) return null;

      try {
        const fenToUse = customFen ?? startingFen;
        const chess = fenToUse ? new Chess(fenToUse) : new Chess();
        let lastMoveDetails = null;

        for (let i = 0; i < movesArray.length; i++) {
          const move = chess.move(movesArray[i]);
          if (i === movesArray.length - 1 && move) {
            lastMoveDetails = { from: move.from, to: move.to };
          }
        }

        return lastMoveDetails;
      } catch (error) {
        console.error('Error getting last move details:', error);
        return null;
      }
    },
    [startingFen]
  );

  // Apply loaded game data from persistence hook
  useEffect(() => {
    if (loadedGameData) {
      if (loadedGameData.startingFen) {
        setStartingFen(loadedGameData.startingFen);
      }
      if (loadedGameData.moves.length > 0) {
        setMovesTo(loadedGameData.moves);
        setLastMove(loadedGameData.lastMove);
      }
      if (loadedGameData.gameStatus !== 'in_progress') {
        setGameStatus(loadedGameData.gameStatus);
        setPlayerResult(loadedGameData.playerResult);
        setShouldMakeAiMove(false);
      }
    }
  }, [loadedGameData, setMovesTo, setStartingFen]);

  // Initialize on mount with initial moves
  useEffect(() => {
    if (!isInitialized && initialMovesFromUrl.length > 0) {
      setLastMove(getLastMoveDetails(initialMovesFromUrl));
      setIsInitialized(true);
    }
  }, [isInitialized, initialMovesFromUrl, getLastMoveDetails]);

  // Update game state whenever moves change
  useEffect(() => {
    if (isLoadingFromStorage) {
      return;
    }

    if (savedGameStatus && savedGameStatus !== 'in_progress') {
      return;
    }

    const gameStateService = new GameStateService(moves, playerSide, startingFen);

    const newIsPlayerTurn = gameStateService.isPlayerTurn();
    const newGameStatus = gameStateService.getGameStatus();

    setIsPlayerTurn(newIsPlayerTurn);
    setGameStatus(newGameStatus);
    setPlayerResult(gameStateService.getPlayerResult());

    if (!newIsPlayerTurn && newGameStatus === 'in_progress') {
      setShouldMakeAiMove(true);
    } else {
      setShouldMakeAiMove(false);
    }
  }, [moves, playerSide, savedGameStatus, startingFen, isLoadingFromStorage]);

  return {
    gameStatus,
    setGameStatus,
    playerResult,
    setPlayerResult,
    isPlayerTurn,
    lastMove,
    setLastMove,
    shouldMakeAiMove,
    setShouldMakeAiMove,
    getLastMoveDetails,
  };
}
