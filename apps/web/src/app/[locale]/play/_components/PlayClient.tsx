'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { GameStateService } from '@blindfold-chess/features/ai-game';
import type { GameStatus } from '@blindfold-chess/features/ai-game';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { Chess } from 'chess.js';

import { LocalStorageGameRepository } from '@/lib/repositories';
import type { GameOutcome, SkillLevel } from '@/lib/types';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  parseUrlSearchParams,
  useAiMoveOrchestration,
  useAiVersus,
  useAutoSave,
  useConfirmationDialogs,
  useGameInitialization,
  useGamePersistence,
  useMoveNavigation,
  useNotation,
} from '../_hooks';
import { BoardViewModal } from './BoardViewModal';
import { ConfirmationModal } from './ConfirmationModal';
import { GameInProgressPanel } from './GameInProgressPanel';
import { GameOverContent } from './GameOverContent';
import { GameSettingsModal } from './GameSettingsModal';
import { MovesPanel } from './MovesPanel';
import { SkillLevelSettingsModal } from './SkillLevelSettingsModal';

type Props = {
  locale: Locale;
  onAiMoveChange?: (move: string | null) => void;
};

export function PlayClient({ locale, onAiMoveChange }: Props) {
  const t = useTranslations('play');
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse URL parameters using the hook
  const urlParams = parseUrlSearchParams(searchParams);
  const {
    playerSide,
    initialSkillLevel,
    initialGameId,
    initialStartingFen,
    initialMovesFromUrl,
    shouldRedirectToError,
    errorDetails,
  } = useGameInitialization(urlParams);

  // Skill level state (can be changed during game)
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(initialSkillLevel);

  // Track starting FEN - can be from URL or loaded from saved game
  const [startingFen, setStartingFen] = useState<string | undefined>(initialStartingFen);

  // Hooks
  const { moves, pushMove, removeMoves, setMovesTo, getFen, getFormattedPgn } = useNotation({
    initialMoves: initialMovesFromUrl,
    startingFen,
  });
  const { getAiMove } = useAiVersus(skillLevel);

  // State
  const [moveInput, setMoveInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const lastSubmittedMoveRef = useRef<{ move: string; timestamp: number } | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSkillLevelSettingsModal, setShowSkillLevelSettingsModal] = useState(false);
  const { preferences, updatePreferences } = useGamePreferences();
  const [isPlayerTurn, setIsPlayerTurn] = useState(playerSide === 'white');
  const [gameStatus, setGameStatus] = useState<GameStatus>('in_progress');
  const [playerResult, setPlayerResult] = useState<'win' | 'loss' | 'draw' | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Game persistence hook
  const { isLoadingFromStorage, savedGameStatus, loadedGameData } = useGamePersistence({
    initialGameId,
    initialStartingFen,
  });

  // Navigation hook
  const {
    currentPosition,
    displayFen: hookDisplayFen,
    navigateToPosition,
    navigateToStart,
    navigatePrevious,
    navigateNext,
    navigateToEnd,
    resetNavigation,
  } = useMoveNavigation({
    moves,
    startingFen,
  });

  const previousMovesLength = useRef(moves.length);
  const [isBoardVisible, setIsBoardVisible] = useState(false);

  const [shouldMakeAiMove, setShouldMakeAiMove] = useState(() => {
    if (initialGameId) {
      return false;
    }
    if (initialMovesFromUrl.length > 0) {
      const gameStateService = new GameStateService(
        initialMovesFromUrl,
        playerSide,
        initialStartingFen
      );
      return !gameStateService.isPlayerTurn() && gameStateService.getGameStatus() === 'in_progress';
    }
    if (initialStartingFen) {
      const fenParts = initialStartingFen.split(' ');
      const turnFromFen = fenParts[1];
      const isWhiteToMove = turnFromFen === 'w';
      return (
        (playerSide === 'white' && !isWhiteToMove) || (playerSide === 'black' && isWhiteToMove)
      );
    }
    return playerSide === 'black';
  });

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
  }, [loadedGameData, setMovesTo]);

  // Map board status to game outcome for repository
  const mapGameStatusToOutcome = useCallback(
    (bs: GameStatus, pr: 'win' | 'loss' | 'draw' | null): GameOutcome => {
      if (bs === 'in_progress') return 'in_progress';
      if (pr === 'win') return 'win';
      if (pr === 'loss') return 'loss';
      return 'draw';
    },
    []
  );

  // Auto-save hook
  const { markPlayerInteraction, gameId } = useAutoSave({
    gameId: initialGameId,
    moves,
    playerColor: playerSide,
    skillLevel,
    status: mapGameStatusToOutcome(gameStatus, playerResult),
    startingFen,
    enabled: !isLoadingFromStorage && !shouldRedirectToError,
    saveOnInit: !initialGameId && !shouldRedirectToError,
  });

  // Redirect to error page if invalid moves detected
  useEffect(() => {
    if (shouldRedirectToError && errorDetails) {
      const params = new URLSearchParams();
      params.set('invalidMove', errorDetails.invalidMove);
      params.set('invalidIndex', errorDetails.invalidIndex.toString());
      params.set('validMoves', JSON.stringify(errorDetails.validMoves));
      params.set('allMoves', JSON.stringify(errorDetails.allMoves));
      params.set('color', playerSide);
      params.set('skillLevel', skillLevel.toString());

      if (initialStartingFen) {
        params.set('fen', initialStartingFen);
      }

      const effectiveGameId = initialGameId || gameId;
      if (effectiveGameId) {
        params.set('gameId', effectiveGameId);
      }

      router.replace(`/${locale}/play/error?${params.toString()}`);
    }
  }, [
    shouldRedirectToError,
    errorDetails,
    router,
    locale,
    playerSide,
    skillLevel,
    initialGameId,
    gameId,
    initialStartingFen,
  ]);

  // Update URL when gameId is generated
  useEffect(() => {
    if (gameId && !initialGameId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('gameId', gameId);
      params.delete('moves');
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [gameId, initialGameId, searchParams, router]);

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

  // AI move orchestration
  const handleAiMoveSuccess = useCallback(
    (move: AlgebraicNotation) => {
      pushMove(move);
      const newMoves = [...moves, move];
      setLastMove(getLastMoveDetails(newMoves));
    },
    [pushMove, moves, getLastMoveDetails]
  );

  const handleAiMoveError = useCallback(() => {
    setError('AI move failed');
    setShouldMakeAiMove(false);
  }, []);

  const { isLoading } = useAiMoveOrchestration({
    shouldMakeAiMove,
    gameStatus,
    moves,
    startingFen,
    getAiMove,
    onAiMoveSuccess: handleAiMoveSuccess,
    onAiMoveError: handleAiMoveError,
  });

  // Handle player move submission
  const handleSubmitMove = useCallback(
    (move: AlgebraicNotation) => {
      if (isLoading) {
        return;
      }

      if (!isPlayerTurn) {
        return;
      }

      const now = Date.now();
      if (lastSubmittedMoveRef.current) {
        const { move: lastMove, timestamp } = lastSubmittedMoveRef.current;
        if (lastMove === move && now - timestamp < 500) {
          return;
        }
      }

      const gameStateService = new GameStateService(moves, playerSide, startingFen);

      if (gameStateService.validateMove(move)) {
        lastSubmittedMoveRef.current = { move, timestamp: now };
        markPlayerInteraction();
        pushMove(move);
        setMoveInput('');
        setError(null);

        const newMoves = [...moves, move];
        setLastMove(getLastMoveDetails(newMoves));
      } else {
        setError(t('invalidMove'));
      }
    },
    [
      moves,
      playerSide,
      pushMove,
      t,
      getLastMoveDetails,
      markPlayerInteraction,
      isLoading,
      isPlayerTurn,
      startingFen,
    ]
  );

  // Confirmation dialogs
  const confirmationDialogs = useConfirmationDialogs({
    onResignConfirm: useCallback(() => {
      markPlayerInteraction();
      setGameStatus('checkmate');
      setPlayerResult('loss');
    }, [markPlayerInteraction]),
    onUndoConfirm: useCallback(() => {
      markPlayerInteraction();
      removeMoves(2);
      setError(null);
      const newMoves = moves.slice(0, -2);
      setLastMove(getLastMoveDetails(newMoves));
    }, [markPlayerInteraction, removeMoves, moves, getLastMoveDetails]),
    onRestartConfirm: useCallback(
      (position: number) => {
        markPlayerInteraction();
        const movesToRemove = moves.length - position - 1;
        if (movesToRemove > 0) {
          removeMoves(movesToRemove);
        }
        const newMoves = moves.slice(0, position + 1);
        setLastMove(getLastMoveDetails(newMoves));
        resetNavigation();
      },
      [markPlayerInteraction, moves, removeMoves, getLastMoveDetails, resetNavigation]
    ),
  });

  // Handle new game from position
  const handleNewGameFromPosition = useCallback(
    (position: number) => {
      const movesToKeep = moves.slice(0, position + 1);
      const params = new URLSearchParams();
      params.set('moves', JSON.stringify(movesToKeep));
      params.set('color', playerSide);
      params.set('skillLevel', skillLevel.toString());

      if (startingFen) {
        params.set('fen', startingFen);
      }

      router.push(`/${locale}/games/new?${params.toString()}`);
    },
    [moves, playerSide, skillLevel, locale, router, startingFen]
  );

  // Handle skill level change
  const handleSkillLevelChange = useCallback(
    async (newSkillLevel: SkillLevel) => {
      markPlayerInteraction();
      setSkillLevel(newSkillLevel);

      const params = new URLSearchParams(searchParams.toString());
      params.set('skillLevel', newSkillLevel.toString());
      router.replace(`?${params.toString()}`, { scroll: false });

      if (gameId) {
        const gameRepository = new LocalStorageGameRepository();
        const savedGame = await gameRepository.load(gameId);
        if (savedGame) {
          await gameRepository.update(gameId, {
            moves: savedGame.moves,
            playerColor: savedGame.playerColor,
            skillLevel: newSkillLevel,
            status: savedGame.status,
            startingFen: savedGame.startingFen,
          });
        }
      }
    },
    [markPlayerInteraction, searchParams, router, gameId]
  );

  // Reset to latest position when new moves are added
  useEffect(() => {
    if (moves.length > previousMovesLength.current) {
      resetNavigation();
    }
    previousMovesLength.current = moves.length;
  }, [moves.length, resetNavigation]);

  // Get current FEN for board display
  const currentFen = getFen();
  const displayFen = hookDisplayFen;
  const formattedPgn = getFormattedPgn();

  // Update parent component with AI's last move
  useEffect(() => {
    if (!onAiMoveChange) return;

    if (moves.length === 0) {
      onAiMoveChange(null);
      return;
    }

    const isAiMove = (index: number) => {
      return playerSide === 'white' ? index % 2 === 1 : index % 2 === 0;
    };

    for (let i = moves.length - 1; i >= 0; i--) {
      if (isAiMove(i)) {
        const moveNumber = Math.floor(i / 2) + 1;
        const isWhiteMove = i % 2 === 0;
        const moveNotation = `${moveNumber}.${isWhiteMove ? '' : '..'} ${moves[i]}`;
        const moveText = t('aiPlayed', { move: moveNotation });
        onAiMoveChange(moveText);
        return;
      }
    }

    onAiMoveChange(null);
  }, [moves, playerSide, onAiMoveChange, t]);

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Game Area */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-lg p-4">
            {/* In Progress Content */}
            {gameStatus === 'in_progress' && (
              <GameInProgressPanel
                isPlayerTurn={isPlayerTurn}
                isLoading={isLoading}
                preferences={preferences}
                updatePreferences={updatePreferences}
                currentFen={currentFen}
                moveInput={moveInput}
                setMoveInput={setMoveInput}
                error={error}
                setError={setError}
                handleSubmitMove={handleSubmitMove}
                moves={moves}
                confirmationDialogs={confirmationDialogs}
                onShowBoard={() => setIsBoardVisible(true)}
                onShowSkillLevelSettings={() => setShowSkillLevelSettingsModal(true)}
                t={t}
              />
            )}

            {/* Game Over Content */}
            {gameStatus !== 'in_progress' && playerResult && (
              <GameOverContent
                locale={locale}
                playerResult={playerResult}
                playerSide={playerSide}
                skillLevel={skillLevel}
                moves={moves}
                formattedPgn={formattedPgn}
                startingFen={startingFen}
                initialGameId={initialGameId}
                onShowBoard={() => setIsBoardVisible(true)}
              />
            )}
          </div>
        </div>

        {/* Move List */}
        <div className="lg:col-span-1">
          <MovesPanel
            formattedPgn={formattedPgn}
            currentPosition={currentPosition}
            movesLength={moves.length}
            currentFen={currentFen}
            displayFen={displayFen}
            startingFen={startingFen}
            gameInProgress={gameStatus === 'in_progress'}
            onNavigateToPosition={navigateToPosition}
            onNavigateToStart={navigateToStart}
            onNavigatePrevious={navigatePrevious}
            onNavigateNext={navigateNext}
            onNavigateToEnd={navigateToEnd}
            onRestartFromPosition={confirmationDialogs.restart.openWithPosition}
            onNewGameFromPosition={handleNewGameFromPosition}
          />
        </div>
      </div>

      {/* Resign Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationDialogs.resign.isOpen}
        onClose={confirmationDialogs.resign.close}
        onConfirm={confirmationDialogs.resign.confirm}
        title={t('confirmResignTitle')}
        message={t('confirmResignMessage')}
        confirmText={t('confirmResign')}
        cancelText={t('cancel')}
        variant="destructive"
      />

      {/* Undo Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationDialogs.undo.isOpen}
        onClose={confirmationDialogs.undo.close}
        onConfirm={confirmationDialogs.undo.confirm}
        title={t('confirmUndoTitle')}
        message={t('confirmUndoMessage')}
        confirmText={t('confirmUndo')}
        cancelText={t('cancel')}
        variant="primary"
      />

      {/* Restart Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationDialogs.restart.isOpen}
        onClose={confirmationDialogs.restart.close}
        onConfirm={confirmationDialogs.restart.confirm}
        title={t('confirmRestartTitle')}
        message={t('confirmRestartMessage')}
        confirmText={t('confirmRestart')}
        cancelText={t('cancel')}
        variant="primary"
      />

      {/* Board View Modal */}
      <BoardViewModal
        isOpen={isBoardVisible}
        onClose={() => setIsBoardVisible(false)}
        fen={displayFen || currentFen}
        playerSide={playerSide}
        lastMove={preferences.highlightLastMove && currentPosition === -1 ? lastMove : null}
        preferences={preferences}
        movesLength={moves.length}
        currentPosition={currentPosition}
        formattedPgn={formattedPgn}
        onNavigateToStart={navigateToStart}
        onNavigatePrevious={navigatePrevious}
        onNavigateNext={navigateNext}
        onNavigateToEnd={navigateToEnd}
        onNavigateToPosition={navigateToPosition}
      />

      {/* Settings Modal */}
      <GameSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        playerSide={playerSide}
      />

      {/* Skill Level Settings Modal */}
      <SkillLevelSettingsModal
        isOpen={showSkillLevelSettingsModal}
        onClose={() => setShowSkillLevelSettingsModal(false)}
        currentSkillLevel={skillLevel}
        onSkillLevelChange={handleSkillLevelChange}
      />
    </div>
  );
}
