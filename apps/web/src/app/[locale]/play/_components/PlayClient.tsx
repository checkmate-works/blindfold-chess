'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import type { AlgebraicNotation, Side } from '@blindfold-chess/core';
import { Chess } from 'chess.js';
import {
  FaChartLine,
  FaCheck,
  FaChevronDown,
  FaCopy,
  FaExternalLinkAlt,
  FaEye,
  FaKeyboard,
  FaList,
  FaPlay,
  FaPlus,
  FaPlusCircle,
} from 'react-icons/fa';

import { fenToLichessUrl } from '@/lib/lichess';
import { LocalStorageGameRepository } from '@/lib/repositories';
import type { SkillLevel } from '@/lib/types';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useAiVersus } from '../_hooks/use-ai-versus';
import { useAutoSave } from '../_hooks/use-auto-save';
import { useNotation } from '../_hooks/use-notation';
import { GameStateService } from '../_lib/game-state-service';
import { formatPgnToText } from '../_lib/pgn-parser';
import { BoardViewModal } from './BoardViewModal';
import { GameSettingsModal } from './GameSettingsModal';
import { FlagIcon, UndoIcon } from './Icons';
import { MoveInput } from './MoveInput';
import { MoveNavigationControls } from './MoveNavigationControls';
import { MoveSelect } from './MoveSelect';
import { SaveIndicator } from './SaveIndicator';
import { SkillLevelSettingsModal } from './SkillLevelSettingsModal';

type Props = {
  locale: Locale;
  onAiMoveChange?: (move: string | null) => void;
};

export function PlayClient({ locale, onAiMoveChange }: Props) {
  const t = useTranslations('play');
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse URL parameters
  const playerSide = (searchParams.get('color') as Side) || 'white';
  const initialSkillLevel = (parseInt(searchParams.get('skillLevel') || '5') as SkillLevel) || 5;
  const initialGameId = searchParams.get('gameId') || undefined;
  const initialStartingFen = searchParams.get('fen') || undefined;

  // Skill level state (can be changed during game)
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(initialSkillLevel);

  // Get initial moves from URL and validate them
  const urlMoves = searchParams.get('moves');
  const parsedMoves = urlMoves ? JSON.parse(urlMoves) : [];

  // Validate moves if we don't have a gameId (gameId takes precedence)
  // When gameId is present, moves will be loaded from localStorage with the correct startingFen
  let initialMovesFromUrl = parsedMoves;
  let shouldRedirectToError = false;
  let errorDetails = null;

  if (parsedMoves.length > 0 && !initialGameId) {
    const validMoves: AlgebraicNotation[] = [];
    // Initialize with custom FEN or standard starting position
    const chess = initialStartingFen ? new Chess(initialStartingFen) : new Chess();

    for (let i = 0; i < parsedMoves.length; i++) {
      const move = parsedMoves[i];
      try {
        const result = chess.move(move);
        if (result) {
          validMoves.push(move as AlgebraicNotation);
        } else {
          // Invalid move found - log warning instead of throwing error
          console.warn(`Invalid move detected in URL: ${move} at index ${i}`);
          shouldRedirectToError = true;
          errorDetails = {
            invalidMove: move,
            invalidIndex: i,
            validMoves,
            allMoves: parsedMoves,
          };
          break;
        }
      } catch (error) {
        // Error processing move - log warning instead of throwing error
        console.warn(`Error processing move from URL: ${move} at index ${i}`, error);
        shouldRedirectToError = true;
        errorDetails = {
          invalidMove: move,
          invalidIndex: i,
          validMoves,
          allMoves: parsedMoves,
        };
        break;
      }
    }

    initialMovesFromUrl = validMoves;
  } else if (initialGameId) {
    // When gameId exists, don't use URL moves - they will be loaded from localStorage
    initialMovesFromUrl = [];
  }

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
  const [isLoading, setIsLoading] = useState(false);
  const isProcessingRef = useRef(false); // Use ref to track processing state
  const lastSubmittedMoveRef = useRef<{ move: string; timestamp: number } | null>(null); // Track last submitted move
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSkillLevelSettingsModal, setShowSkillLevelSettingsModal] = useState(false);
  const { preferences, updatePreferences } = useGamePreferences();
  const [isPlayerTurn, setIsPlayerTurn] = useState(playerSide === 'white');
  const [gameStatus, setGameStatus] = useState<'in_progress' | 'checkmate' | 'stalemate' | 'draw'>(
    'in_progress'
  );
  const [playerResult, setPlayerResult] = useState<'win' | 'loss' | 'draw' | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [savedGameStatus, setSavedGameStatus] = useState<
    'in_progress' | 'win' | 'loss' | 'draw' | null
  >(null);
  const [currentPosition, setCurrentPosition] = useState(-1); // -1 means latest position
  const [displayFen, setDisplayFen] = useState<string | null>(null);
  const previousMovesLength = useRef(moves.length);
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [isMovesVisible, setIsMovesVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFenCopied, setIsFenCopied] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [restartPosition, setRestartPosition] = useState<number | null>(null);

  // Load saved game status if gameId exists
  useEffect(() => {
    const loadSavedGameStatus = async () => {
      if (initialGameId) {
        const gameRepository = new LocalStorageGameRepository();
        const savedGame = await gameRepository.load(initialGameId);
        if (savedGame) {
          setSavedGameStatus(savedGame.status);
          // If game is finished, set the appropriate states
          if (savedGame.status !== 'in_progress') {
            if (savedGame.status === 'loss') {
              setGameStatus('checkmate');
              setPlayerResult('loss');
            } else if (savedGame.status === 'win') {
              setGameStatus('checkmate');
              setPlayerResult('win');
            } else if (savedGame.status === 'draw') {
              setGameStatus('draw');
              setPlayerResult('draw');
            }
            // Prevent AI from making moves on finished games
            setShouldMakeAiMove(false);
          }
        }
      }
    };
    loadSavedGameStatus();
  }, [initialGameId]);

  const [shouldMakeAiMove, setShouldMakeAiMove] = useState(() => {
    // When loading from gameId, don't make AI move until game is loaded from localStorage
    // This prevents the AI from making a move based on empty state before the saved game is loaded
    if (initialGameId) {
      return false;
    }
    // Check if it's AI's turn when resuming a game
    if (initialMovesFromUrl.length > 0) {
      const gameStateService = new GameStateService(
        initialMovesFromUrl,
        playerSide,
        initialStartingFen
      );
      return !gameStateService.isPlayerTurn() && gameStateService.getGameStatus() === 'in_progress';
    }
    // For custom starting positions, check who moves first from FEN
    if (initialStartingFen) {
      const fenParts = initialStartingFen.split(' ');
      const turnFromFen = fenParts[1]; // 'w' or 'b'
      // AI plays first if it's AI's turn
      const isWhiteToMove = turnFromFen === 'w';
      return (
        (playerSide === 'white' && !isWhiteToMove) || (playerSide === 'black' && isWhiteToMove)
      );
    }
    // New game with standard position: AI plays first if player is black
    return playerSide === 'black';
  });

  // Map game status to repository status
  const mapGameStatus = useCallback(
    (
      gs: 'in_progress' | 'checkmate' | 'stalemate' | 'draw',
      pr: 'win' | 'loss' | 'draw' | null
    ) => {
      if (gs === 'in_progress') return 'in_progress' as const;
      if (pr === 'win') return 'win' as const;
      if (pr === 'loss') return 'loss' as const;
      return 'draw' as const;
    },
    []
  );

  // Track if we're loading from localStorage
  const [isLoadingFromStorage, setIsLoadingFromStorage] = useState(!!initialGameId);

  // Clear save toast flag on mount when we have a gameId (reload scenario)
  useEffect(() => {
    if (initialGameId && typeof window !== 'undefined') {
      sessionStorage.removeItem('blindfold_chess_show_save_toast');
    }
  }, [initialGameId]); // Run only once on mount

  // Auto-save hook
  const { markPlayerInteraction, gameId, isSaving, lastSavedAt } = useAutoSave({
    gameId: initialGameId,
    moves,
    playerColor: playerSide,
    skillLevel,
    status: mapGameStatus(gameStatus, playerResult),
    startingFen,
    enabled: !isLoadingFromStorage && !shouldRedirectToError, // Disable auto-save while loading from storage or if error detected
    saveOnInit: !initialGameId && !shouldRedirectToError, // Save on init for new games, but not if error detected
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

      // Include custom starting FEN if present
      if (initialStartingFen) {
        params.set('fen', initialStartingFen);
      }

      // Use the current gameId (either from URL or auto-generated) to prevent duplication
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
      // Only update URL if we didn't have a gameId initially
      const params = new URLSearchParams(searchParams.toString());
      params.set('gameId', gameId);
      // Remove moves parameter as we're now using gameId
      params.delete('moves');
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [gameId, initialGameId, searchParams, router]);

  // Helper function to get last move details from chess.js
  const getLastMoveDetails = useCallback(
    (movesArray: AlgebraicNotation[], customFen?: string) => {
      if (movesArray.length === 0) return null;

      try {
        // Use customFen if provided, otherwise fall back to startingFen state or standard position
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

  // Load moves from localStorage on client-side
  useEffect(() => {
    const loadGame = async () => {
      if (initialGameId && typeof window !== 'undefined') {
        setIsLoadingFromStorage(true);

        // Clear any existing save toast flag immediately when loading a game
        // This prevents showing toast on reload
        sessionStorage.removeItem('blindfold_chess_show_save_toast');

        // Use LocalStorageGameRepository
        const gameRepository = new LocalStorageGameRepository();
        const savedGame = await gameRepository.load(initialGameId);

        if (savedGame) {
          // Load starting FEN if present (for custom starting positions)
          if (savedGame.startingFen) {
            setStartingFen(savedGame.startingFen);
          }

          if (savedGame.moves && savedGame.moves.length > 0) {
            setMovesTo(savedGame.moves);

            // Update last move details - pass startingFen directly since state update is async
            setLastMove(getLastMoveDetails(savedGame.moves, savedGame.startingFen));
          }

          // Also update game status if finished
          if (savedGame.status && savedGame.status !== 'in_progress') {
            setSavedGameStatus(savedGame.status);
            if (savedGame.status === 'loss') {
              setGameStatus('checkmate');
              setPlayerResult('loss');
            } else if (savedGame.status === 'win') {
              setGameStatus('checkmate');
              setPlayerResult('win');
            } else if (savedGame.status === 'draw') {
              setGameStatus('draw');
              setPlayerResult('draw');
            }
          }
        }

        setIsLoadingFromStorage(false);
      }
    };

    loadGame();
  }, [initialGameId, setMovesTo, getLastMoveDetails]);

  // Initialize on mount with initial moves
  useEffect(() => {
    if (!isInitialized && initialMovesFromUrl.length > 0) {
      setLastMove(getLastMoveDetails(initialMovesFromUrl));
      setIsInitialized(true);
    }
  }, [isInitialized, initialMovesFromUrl, getLastMoveDetails]);

  // Update game state whenever moves change
  useEffect(() => {
    // Don't update game state while loading from storage
    // This prevents triggering AI move with empty moves before game data is loaded
    if (isLoadingFromStorage) {
      return;
    }

    // Don't update game state from moves if we've already loaded a finished game
    if (savedGameStatus && savedGameStatus !== 'in_progress') {
      return;
    }

    const gameStateService = new GameStateService(moves, playerSide, startingFen);

    const newIsPlayerTurn = gameStateService.isPlayerTurn();
    const newGameStatus = gameStateService.getGameStatus();

    setIsPlayerTurn(newIsPlayerTurn);
    setGameStatus(newGameStatus);
    setPlayerResult(gameStateService.getPlayerResult());

    // Update shouldMakeAiMove based on current state
    // This ensures the flag is always synchronized with the actual game state
    if (!newIsPlayerTurn && newGameStatus === 'in_progress') {
      // Only set to true if not already processing to avoid duplicate requests
      if (!isProcessingRef.current) {
        setShouldMakeAiMove(true);
      }
    } else {
      // Explicitly reset the flag when it's player's turn or game is over
      // This prevents stale state from blocking future AI moves
      setShouldMakeAiMove(false);
    }
  }, [moves, playerSide, savedGameStatus, startingFen, isLoadingFromStorage]);

  // Make AI move when it's AI's turn
  useEffect(() => {
    let isCancelled = false;

    const executeAiMove = async () => {
      if (isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;
      setIsLoading(true);

      // Retry logic for when engine is busy (can happen in StrictMode)
      const maxRetries = 10;
      const retryDelay = 200; // ms

      let aiMove: string | null = null;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (isCancelled) {
          return;
        }

        try {
          aiMove = await getAiMove(moves, startingFen);
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error as Error;
          // If engine is busy, wait and retry
          if (error instanceof Error && error.message.includes('already processing')) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          }
          // For other errors, don't retry
          break;
        }
      }

      // Check if this effect was cleaned up while we were waiting
      if (isCancelled) {
        return;
      }

      if (aiMove) {
        pushMove(aiMove as AlgebraicNotation);
        // Update last move
        const newMoves = [...moves, aiMove as AlgebraicNotation];
        setLastMove(getLastMoveDetails(newMoves));
      } else if (lastError) {
        console.error('Failed to get AI move:', lastError);
        setError('AI move failed');
        setShouldMakeAiMove(false);
      }

      if (!isCancelled) {
        setIsLoading(false);
        isProcessingRef.current = false;
      }
    };

    if (shouldMakeAiMove && gameStatus === 'in_progress') {
      executeAiMove();
    }

    return () => {
      isCancelled = true;
      // Reset processing state on cleanup to allow fresh start on re-mount
      isProcessingRef.current = false;
    };
  }, [shouldMakeAiMove, gameStatus, moves, getAiMove, pushMove, getLastMoveDetails, startingFen]);

  // Handle player move submission
  const handleSubmitMove = useCallback(
    (move: AlgebraicNotation) => {
      // Prevent submission if AI is processing or loading
      if (isLoading || isProcessingRef.current) {
        return;
      }

      // Prevent submission if it's not player's turn
      if (!isPlayerTurn) {
        return;
      }

      // Prevent duplicate submission within 500ms
      const now = Date.now();
      if (lastSubmittedMoveRef.current) {
        const { move: lastMove, timestamp } = lastSubmittedMoveRef.current;
        if (lastMove === move && now - timestamp < 500) {
          return;
        }
      }

      const gameStateService = new GameStateService(moves, playerSide, startingFen);

      if (gameStateService.validateMove(move)) {
        // Record this submission to prevent duplicates
        lastSubmittedMoveRef.current = { move, timestamp: now };

        markPlayerInteraction(); // Mark that player has made a move
        pushMove(move);
        setMoveInput('');
        setError(null);

        // Update last move
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

  // Handle undo
  const handleUndo = useCallback(() => {
    setShowUndoConfirm(true);
  }, []);

  const confirmUndo = useCallback(() => {
    markPlayerInteraction(); // Mark interaction for undo
    // Remove last 2 moves (player and AI)
    removeMoves(2);
    setError(null);

    // Update last move
    const newMoves = moves.slice(0, -2);
    setLastMove(getLastMoveDetails(newMoves));

    setShowUndoConfirm(false);
  }, [removeMoves, moves, getLastMoveDetails, markPlayerInteraction]);

  // Handle restart from position
  const handleRestartFromPosition = useCallback((position: number) => {
    setRestartPosition(position);
    setShowRestartConfirm(true);
  }, []);

  const confirmRestart = useCallback(() => {
    if (restartPosition === null) return;

    markPlayerInteraction(); // Mark interaction for restart
    // Remove all moves after the selected position
    const movesToRemove = moves.length - restartPosition - 1;
    if (movesToRemove > 0) {
      removeMoves(movesToRemove);
    }

    // Update last move
    const newMoves = moves.slice(0, restartPosition + 1);
    setLastMove(getLastMoveDetails(newMoves));

    // Reset to latest position after restart
    setCurrentPosition(-1);
    setDisplayFen(null);

    setShowRestartConfirm(false);
    setRestartPosition(null);
  }, [restartPosition, moves, removeMoves, getLastMoveDetails, markPlayerInteraction]);

  // Handle new game from position
  const handleNewGameFromPosition = useCallback(
    (position: number) => {
      // Get moves up to the selected position
      const movesToKeep = moves.slice(0, position + 1);

      // Navigate to new game page with moves and current settings
      const params = new URLSearchParams();
      params.set('moves', JSON.stringify(movesToKeep));
      params.set('color', playerSide);
      params.set('skillLevel', skillLevel.toString());

      // Include custom starting FEN if present
      if (startingFen) {
        params.set('fen', startingFen);
      }

      router.push(`/${locale}/game/new?${params.toString()}`);
    },
    [moves, playerSide, skillLevel, locale, router, startingFen]
  );

  // Handle resign
  const handleResign = useCallback(() => {
    setShowResignConfirm(true);
  }, []);

  const confirmResign = useCallback(() => {
    markPlayerInteraction(); // Mark interaction for resign
    // Set game as loss for player
    setGameStatus('checkmate');
    setPlayerResult('loss');
    setShowResignConfirm(false);
  }, [markPlayerInteraction]);

  // Handle skill level change
  const handleSkillLevelChange = useCallback(
    async (newSkillLevel: SkillLevel) => {
      markPlayerInteraction(); // Mark interaction for skill level change
      setSkillLevel(newSkillLevel);

      // Update URL parameter
      const params = new URLSearchParams(searchParams.toString());
      params.set('skillLevel', newSkillLevel.toString());
      router.replace(`?${params.toString()}`, { scroll: false });

      // Update localStorage if game exists
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

  // Navigation functions for move history
  const navigateToPosition = useCallback(
    (position: number) => {
      // Initialize with custom FEN or standard starting position
      const chess = startingFen ? new Chess(startingFen) : new Chess();

      // Reset board
      if (position === -1 || position >= moves.length) {
        // Show latest position
        setCurrentPosition(-1);
        setDisplayFen(null);
        return;
      }

      // Apply moves up to the specified position
      const movesToApply = moves.slice(0, position + 1);
      try {
        for (const move of movesToApply) {
          chess.move(move);
        }
        setCurrentPosition(position);
        setDisplayFen(chess.fen());
      } catch (error) {
        console.error('Error navigating to position:', error);
        setCurrentPosition(-1);
        setDisplayFen(null);
      }
    },
    [moves, startingFen]
  );

  const navigateToStart = useCallback(() => {
    // Show initial position (before any moves)
    // Use custom FEN if available, otherwise standard starting position
    const chess = startingFen ? new Chess(startingFen) : new Chess();
    setDisplayFen(chess.fen());
    setCurrentPosition(-2); // Special value to indicate start position
  }, [startingFen]);

  const navigateToEnd = useCallback(() => {
    setCurrentPosition(-1);
    setDisplayFen(null);
  }, []);

  const navigatePrevious = useCallback(() => {
    if (currentPosition === -2) {
      // Already at start, can't go back further
      return;
    }

    if (currentPosition === -1) {
      // From latest position, go to the move before the last
      if (moves.length > 0) {
        navigateToPosition(moves.length - 2);
      }
    } else if (currentPosition === 0) {
      // From first move, go to start position
      navigateToStart();
    } else {
      // Normal navigation
      navigateToPosition(currentPosition - 1);
    }
  }, [currentPosition, moves.length, navigateToPosition, navigateToStart]);

  const navigateNext = useCallback(() => {
    if (currentPosition === -2) {
      // From start position, go to first move
      if (moves.length > 0) {
        navigateToPosition(0);
      }
    } else if (currentPosition === -1) {
      // Already at latest position, can't go forward
      return;
    } else {
      const newPosition = currentPosition + 1;
      if (newPosition < moves.length) {
        navigateToPosition(newPosition);
      }
    }
  }, [currentPosition, moves.length, navigateToPosition]);

  // Reset to latest position when new moves are added
  useEffect(() => {
    // Only reset to latest position if moves were added (not removed)
    if (moves.length > previousMovesLength.current) {
      setCurrentPosition(-1);
      setDisplayFen(null);
    }
    previousMovesLength.current = moves.length;
  }, [moves.length]); // Only trigger when moves length changes

  // Get current FEN for board display
  const currentFen = getFen();
  const formattedPgn = getFormattedPgn();

  // Update parent component with AI's last move
  useEffect(() => {
    if (!onAiMoveChange) return;

    if (moves.length === 0) {
      onAiMoveChange(null);
      return;
    }

    // Get the latest AI move
    // If player is white, AI plays black (odd indices: 1, 3, 5...)
    // If player is black, AI plays white (even indices: 0, 2, 4...)
    const isAiMove = (index: number) => {
      return playerSide === 'white' ? index % 2 === 1 : index % 2 === 0;
    };

    // Find the last AI move
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
              <div className="flex flex-col gap-6">
                {/* Move Input */}
                <div>
                  {isPlayerTurn ? (
                    <>
                      {preferences.moveInputMode === 'select' ? (
                        <MoveSelect
                          fen={currentFen}
                          onSubmit={handleSubmitMove}
                          onChange={() => {
                            // Clear error when user changes selection
                            if (error) setError(null);
                          }}
                          disabled={isLoading}
                          placeholder={t('selectMove')}
                        />
                      ) : (
                        <MoveInput
                          value={moveInput}
                          onChange={(value) => {
                            setMoveInput(value);
                            // Clear error when user starts typing
                            if (error) setError(null);
                          }}
                          onSubmit={handleSubmitMove}
                          disabled={isLoading}
                          placeholder={t('inputMove')}
                          showSuggestions={preferences.enableAutoComplete}
                          showSubmitButton={true}
                        />
                      )}
                      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      {isLoading ? t('aiThinking') : t('yourMove')}
                    </p>
                  )}
                </div>

                {/* Toggle & Save Indicator */}
                {isPlayerTurn && (
                  <div className="flex items-center">
                    <div className="flex-1">
                      <SaveIndicator isSaving={isSaving} lastSavedAt={lastSavedAt} />
                    </div>
                    <button
                      onClick={() =>
                        updatePreferences({
                          moveInputMode: preferences.moveInputMode === 'text' ? 'select' : 'text',
                        })
                      }
                      className="p-2 border border-border rounded-md hover:bg-muted"
                      title={
                        preferences.moveInputMode === 'text'
                          ? t('switchToSelect')
                          : t('switchToText')
                      }
                    >
                      {preferences.moveInputMode === 'text' ? (
                        <FaList className="w-4 h-4" />
                      ) : (
                        <FaKeyboard className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 md:gap-2 justify-center">
                  <button
                    onClick={() => setIsBoardVisible(true)}
                    className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center justify-center gap-2"
                    title={t('showBoard')}
                  >
                    <FaEye className="w-4 h-4" />
                    <span className="hidden md:inline">{t('showBoard')}</span>
                  </button>
                  <button
                    onClick={handleUndo}
                    disabled={moves.length < 2}
                    className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 flex items-center justify-center gap-2"
                    title={t('undo')}
                  >
                    <UndoIcon className="w-4 h-4" />
                    <span className="hidden md:inline">{t('undo')}</span>
                  </button>
                  <button
                    onClick={handleResign}
                    className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center justify-center gap-2"
                    title={t('resign')}
                  >
                    <FlagIcon className="w-4 h-4" />
                    <span className="hidden md:inline">{t('resign')}</span>
                  </button>
                </div>

                {/* Settings Links */}
                <div className="text-center">
                  <button
                    onClick={() => setShowSkillLevelSettingsModal(true)}
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    {t('configureSkillLevel')}
                  </button>
                </div>
              </div>
            )}

            {/* Game Over Content */}
            {gameStatus !== 'in_progress' && (
              <div className="flex flex-col gap-4">
                {/* Game Result */}
                {playerResult && (
                  <div className="text-center">
                    <p className="text-lg font-bold">
                      {playerResult === 'win' && (
                        <span className="text-green-600 dark:text-green-400">✓ {t('youWin')}</span>
                      )}
                      {playerResult === 'loss' && (
                        <span className="text-red-600 dark:text-red-400">✗ {t('youLose')}</span>
                      )}
                      {playerResult === 'draw' && (
                        <span className="text-yellow-600 dark:text-yellow-400">= {t('draw')}</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Show Board Button */}
                <div className="flex gap-4 md:gap-2 justify-center">
                  <button
                    onClick={() => setIsBoardVisible(true)}
                    className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center justify-center gap-2"
                    title={t('showBoard')}
                  >
                    <FaEye className="w-4 h-4" />
                    <span className="hidden md:inline">{t('showBoard')}</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<FaPlus className="w-5 h-5" />}
                    onClick={() => (window.location.href = `/${locale}/game/new`)}
                    className="w-full rounded-xl font-medium"
                  >
                    {t('newGame')}
                  </Button>
                  {moves.length > 0 && (
                    <Button
                      variant="secondary"
                      size="lg"
                      icon={<FaChartLine className="w-5 h-5" />}
                      onClick={() => {
                        // Create PGN from moves
                        const pgnMoves = formattedPgn
                          .map((move) => {
                            const moveNumber = `${move.moveNumber}.`;
                            const movePair = move.blackMove
                              ? `${moveNumber} ${move.whiteMove} ${move.blackMove}`
                              : `${moveNumber} ${move.whiteMove}`;
                            return movePair;
                          })
                          .join(' ');

                        const params = new URLSearchParams();
                        params.set('pgn', pgnMoves);
                        params.set('color', playerSide);
                        params.set('autoOpponent', 'true');

                        // Pass custom starting FEN if present
                        if (startingFen) {
                          params.set('fen', startingFen);
                        }

                        // Pass game parameters to allow returning to the exact game state
                        if (initialGameId) {
                          params.set('gameId', initialGameId);
                        }
                        params.set('skillLevel', skillLevel.toString());
                        params.set('moves', JSON.stringify(moves));

                        router.push(`/${locale}/play/postmortem?${params.toString()}`);
                      }}
                      className="w-full rounded-xl font-medium"
                    >
                      {t('postmortem')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Move List */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow-lg">
            {/* Moves Toggle Header */}
            <button
              onClick={() => setIsMovesVisible(!isMovesVisible)}
              className={`w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-border/50 focus:ring-inset rounded-t-lg ${!isMovesVisible ? 'rounded-b-lg' : ''}`}
              aria-expanded={isMovesVisible}
            >
              <div className="flex items-center justify-between">
                <span className="text-foreground">{t('moves')}</span>
                <FaChevronDown
                  className={`w-5 h-5 text-muted-foreground transform transition-transform duration-200 ${
                    isMovesVisible ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Moves Content */}
            <div
              className={`transition-all duration-300 ${isMovesVisible ? 'block' : 'hidden'} rounded-b-lg`}
            >
              <div className="p-4 max-h-[70vh] overflow-y-auto font-mono">
                {formattedPgn.length > 0 ? (
                  <div className="space-y-0.5">
                    {formattedPgn.map((move, index) => {
                      const whiteIndex = index * 2;
                      const blackIndex = index * 2 + 1;
                      const isWhiteHighlighted = currentPosition === whiteIndex;
                      const isBlackHighlighted = currentPosition === blackIndex;

                      return (
                        <div key={move.moveNumber} className="flex items-center text-sm">
                          <span className="w-10 text-right pr-2 text-muted-foreground">
                            {move.moveNumber}.
                          </span>
                          <span
                            className={`flex-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              isWhiteHighlighted
                                ? 'bg-foreground/15 font-semibold dark:bg-foreground/10'
                                : 'hover:bg-muted/40'
                            }`}
                            onClick={() => navigateToPosition(whiteIndex)}
                          >
                            {move.whiteMove}
                          </span>
                          <span
                            className={`flex-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              isBlackHighlighted
                                ? 'bg-foreground/15 font-semibold dark:bg-foreground/10'
                                : move.blackMove
                                  ? 'hover:bg-muted/40'
                                  : ''
                            } ${!move.blackMove ? 'pointer-events-none' : ''}`}
                            onClick={() => move.blackMove && navigateToPosition(blackIndex)}
                          >
                            {move.blackMove || ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No moves yet</p>
                )}

                {/* Navigation Controls */}
                {moves.length > 0 && (
                  <div className="mt-4">
                    <MoveNavigationControls
                      onNavigateToStart={navigateToStart}
                      onNavigatePrevious={navigatePrevious}
                      onNavigateNext={navigateNext}
                      onNavigateToEnd={navigateToEnd}
                      isPreviousDisabled={
                        currentPosition === -2 || (currentPosition === -1 && moves.length === 0)
                      }
                      isNextDisabled={currentPosition === -1}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                {moves.length > 0 && (
                  <div className="mt-4 flex flex-col gap-4">
                    {currentPosition !== -1 && currentPosition !== -2 && (
                      <>
                        {/* Restart from here button - only show if game is still in progress */}
                        {gameStatus === 'in_progress' && (
                          <Button
                            variant="primary"
                            icon={<FaPlay className="w-3 h-3" />}
                            onClick={() => handleRestartFromPosition(currentPosition)}
                          >
                            {t('restartFromHere')}
                          </Button>
                        )}
                        {/* New game from here button - always show when navigating moves */}
                        <Button
                          variant="secondary"
                          icon={<FaPlusCircle className="w-3 h-3" />}
                          onClick={() => handleNewGameFromPosition(currentPosition)}
                        >
                          {t('newGameFromHere')}
                        </Button>
                      </>
                    )}

                    {/* Analyze on Lichess Button */}
                    <Button
                      variant="secondary"
                      icon={<FaExternalLinkAlt className="w-3 h-3" />}
                      onClick={() => {
                        // Get FEN for current position
                        let fenToAnalyze: string;
                        if (currentPosition === -1 || displayFen === null) {
                          // Latest position
                          fenToAnalyze = currentFen;
                        } else {
                          // Historical position
                          fenToAnalyze = displayFen;
                        }
                        const lichessUrl = fenToLichessUrl(fenToAnalyze);
                        window.open(lichessUrl, '_blank');
                      }}
                    >
                      {t('analyzeOnLichess')}
                    </Button>

                    {/* Copy PGN Button */}
                    <Button
                      variant="secondary"
                      icon={
                        isCopied ? (
                          <FaCheck className="w-3 h-3 text-green-500" />
                        ) : (
                          <FaCopy className="w-3 h-3" />
                        )
                      }
                      onClick={() => {
                        const pgnText = formatPgnToText(formattedPgn, startingFen);

                        navigator.clipboard.writeText(pgnText).then(() => {
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        });
                      }}
                    >
                      {isCopied ? t('copied') || 'Copied!' : t('copyPgn')}
                    </Button>

                    {/* Copy FEN Button */}
                    <Button
                      variant="secondary"
                      icon={
                        isFenCopied ? (
                          <FaCheck className="w-3 h-3 text-green-500" />
                        ) : (
                          <FaCopy className="w-3 h-3" />
                        )
                      }
                      onClick={() => {
                        // Use the same FEN that is sent to Lichess
                        let fenToCopy: string;
                        if (currentPosition === -1) {
                          // Current position
                          fenToCopy = currentFen;
                        } else {
                          // Historical position
                          fenToCopy = displayFen || currentFen;
                        }

                        navigator.clipboard.writeText(fenToCopy).then(() => {
                          setIsFenCopied(true);
                          setTimeout(() => setIsFenCopied(false), 2000);
                        });
                      }}
                    >
                      {isFenCopied ? t('copied') || 'Copied!' : t('copyFen')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resign Confirmation Modal */}
      {showResignConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('confirmResignTitle')}</h3>
            <p className="text-muted-foreground mb-6">{t('confirmResignMessage')}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowResignConfirm(false)}>
                {t('cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmResign}>
                {t('confirmResign')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Confirmation Modal */}
      {showUndoConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('confirmUndoTitle')}</h3>
            <p className="text-muted-foreground mb-6">{t('confirmUndoMessage')}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowUndoConfirm(false)}>
                {t('cancel')}
              </Button>
              <Button variant="primary" onClick={confirmUndo}>
                {t('confirmUndo')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restart Confirmation Modal */}
      {showRestartConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('confirmRestartTitle')}</h3>
            <p className="text-muted-foreground mb-6">{t('confirmRestartMessage')}</p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRestartConfirm(false);
                  setRestartPosition(null);
                }}
              >
                {t('cancel')}
              </Button>
              <Button variant="primary" onClick={confirmRestart}>
                {t('confirmRestart')}
              </Button>
            </div>
          </div>
        </div>
      )}

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
