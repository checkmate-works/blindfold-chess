'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { FaChevronDown, FaEye, FaEyeSlash, FaCopy, FaCheck } from 'react-icons/fa';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotation } from '../_hooks/use-notation';
import { useAiVersus } from '../_hooks/use-ai-versus';
import { useAutoSave } from '../_hooks/use-auto-save';
import { GameStateService } from '../_lib/game-state-service';
import { LocalStorageGameRepository } from '@/lib/repositories';
import { SimpleChessBoard } from './SimpleChessBoard';
import { MoveInput } from './MoveInput';
import { MoveSelect } from './MoveSelect';
import { UndoIcon, FlagIcon } from './Icons';
import { Chess } from 'chess.js';
import type { AlgebraicNotation, Side, SkillLevel } from '@/lib/types';
import type { Locale } from '../../_lib/types';
import { useGamePreferences } from '../../_contexts/GamePreferencesContext';
import { GameSettingsModal } from './GameSettingsModal';
import { ControlSettingsModal } from './ControlSettingsModal';

interface PlayClientProps {
  locale: Locale;
  onAiMoveChange?: (move: string | null) => void;
}

export function PlayClient({ locale, onAiMoveChange }: PlayClientProps) {
  const t = useTranslations('play');
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse URL parameters
  const playerSide = (searchParams.get('color') as Side) || 'white';
  const skillLevel = (parseInt(searchParams.get('skillLevel') || '5') as SkillLevel) || 5;
  const initialGameId = searchParams.get('gameId') || undefined;

  // Get initial moves from URL and validate them
  const urlMoves = searchParams.get('moves');
  const parsedMoves = urlMoves ? JSON.parse(urlMoves) : [];

  // Validate moves if we don't have a gameId (gameId takes precedence)
  let initialMovesFromUrl = parsedMoves;
  let shouldRedirectToError = false;
  let errorDetails = null;

  if (!initialGameId && parsedMoves.length > 0) {
    const validMoves: AlgebraicNotation[] = [];
    const chess = new Chess();

    for (let i = 0; i < parsedMoves.length; i++) {
      const move = parsedMoves[i];
      try {
        const result = chess.move(move);
        if (result) {
          validMoves.push(move as AlgebraicNotation);
        } else {
          // Invalid move found
          shouldRedirectToError = true;
          errorDetails = {
            invalidMove: move,
            invalidIndex: i,
            validMoves,
            allMoves: parsedMoves,
          };
          break;
        }
      } catch {
        // Error processing move
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
  }

  // Hooks
  const { moves, pushMove, removeMoves, setMovesTo, getFen, getFormattedPgn } =
    useNotation(initialMovesFromUrl);
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
  const [showControlSettingsModal, setShowControlSettingsModal] = useState(false);
  const { preferences } = useGamePreferences();
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
    // Check if it's AI's turn when resuming a game
    if (initialMovesFromUrl.length > 0) {
      const gameStateService = new GameStateService(initialMovesFromUrl, playerSide);
      return !gameStateService.isPlayerTurn() && gameStateService.getGameStatus() === 'in_progress';
    }
    // New game: AI plays first if player is black
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
  const { markPlayerInteraction, gameId } = useAutoSave({
    gameId: initialGameId,
    moves,
    playerColor: playerSide,
    skillLevel,
    status: mapGameStatus(gameStatus, playerResult),
    enabled: !isLoadingFromStorage, // Disable auto-save while loading from storage
    saveOnInit: !initialGameId, // Save on init for new games (including PGN imports)
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

      if (initialGameId) {
        params.set('gameId', initialGameId);
      }

      router.replace(`/${locale}/play/error?${params.toString()}`);
    }
  }, [shouldRedirectToError, errorDetails, router, locale, playerSide, skillLevel, initialGameId]);

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
  const getLastMoveDetails = useCallback((movesArray: AlgebraicNotation[]) => {
    if (movesArray.length === 0) return null;

    try {
      const chess = new Chess();
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
  }, []);

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

        if (savedGame && savedGame.moves && savedGame.moves.length > 0) {
          setMovesTo(savedGame.moves);

          // Update last move details
          setLastMove(getLastMoveDetails(savedGame.moves));

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

  // Helper function to make AI move
  const makeAiMove = useCallback(
    async (currentMoves: AlgebraicNotation[]) => {
      // Double-check we're not already processing using ref
      if (isProcessingRef.current) {
        console.warn('AI move already in progress, skipping');
        return;
      }

      isProcessingRef.current = true; // Mark as processing
      setIsLoading(true);

      try {
        setShouldMakeAiMove(false); // Prevent multiple AI moves immediately
        const aiMove = await getAiMove(currentMoves);
        pushMove(aiMove);

        // Update last move
        const newMoves = [...currentMoves, aiMove];
        setLastMove(getLastMoveDetails(newMoves));
      } catch (error) {
        console.error('Failed to get AI move:', error);
        setError('AI move failed');
        setShouldMakeAiMove(false); // Reset on error
      } finally {
        setIsLoading(false);
        isProcessingRef.current = false; // Clear processing flag
      }
    },
    [getAiMove, pushMove, getLastMoveDetails]
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
    // Don't update game state from moves if we've already loaded a finished game
    if (savedGameStatus && savedGameStatus !== 'in_progress') {
      return;
    }

    const gameStateService = new GameStateService(moves, playerSide);

    const newIsPlayerTurn = gameStateService.isPlayerTurn();
    setIsPlayerTurn(newIsPlayerTurn);
    setGameStatus(gameStateService.getGameStatus());
    setPlayerResult(gameStateService.getPlayerResult());

    // Check if we should trigger AI move
    if (!newIsPlayerTurn && gameStateService.getGameStatus() === 'in_progress') {
      setShouldMakeAiMove(true);
    }
  }, [moves, playerSide, savedGameStatus]);

  // Make AI move when it's AI's turn
  useEffect(() => {
    if (shouldMakeAiMove && !isProcessingRef.current && gameStatus === 'in_progress') {
      makeAiMove(moves);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldMakeAiMove, gameStatus]); // Intentionally omit some deps to prevent re-runs

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

      const gameStateService = new GameStateService(moves, playerSide);

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

  // Navigation functions for move history
  const navigateToPosition = useCallback(
    (position: number) => {
      const chess = new Chess();

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
    [moves]
  );

  const navigateToStart = useCallback(() => {
    // Show initial position (before any moves)
    const chess = new Chess();
    setDisplayFen(chess.fen());
    setCurrentPosition(-2); // Special value to indicate start position
  }, []);

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
        const moveText =
          locale === 'ja' ? `AIが${moveNotation}を指しました` : `AI played ${moveNotation}`;
        onAiMoveChange(moveText);
        return;
      }
    }

    onAiMoveChange(null);
  }, [moves, playerSide, onAiMoveChange, locale]);

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chess Board */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-lg">
            {/* Board Toggle Header */}
            <button
              onClick={() => setIsBoardVisible(!isBoardVisible)}
              className={`w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-border/50 focus:ring-inset rounded-t-lg ${!isBoardVisible ? 'rounded-b-lg' : ''}`}
              aria-expanded={isBoardVisible}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isBoardVisible ? (
                    <FaEye className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <FaEyeSlash className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-foreground">
                    {isBoardVisible ? t('hideBoard') : t('showBoard')}
                  </span>
                </div>
                <FaChevronDown
                  className={`w-5 h-5 text-muted-foreground transform transition-transform duration-200 ${
                    isBoardVisible ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Board Content */}
            <div
              className={`transition-all duration-300 ${isBoardVisible ? 'block' : 'hidden'} rounded-b-lg`}
            >
              <div className={`p-4 ${gameStatus !== 'in_progress' ? 'pb-8' : ''}`}>
                <SimpleChessBoard
                  fen={displayFen || currentFen}
                  flipped={playerSide === 'black'}
                  playerSide={playerSide}
                  lastMove={
                    preferences.highlightLastMove && currentPosition === -1 ? lastMove : null
                  }
                  showCoordinates={preferences.showCoordinates}
                  showOwnPieces={preferences.showOwnPieces}
                  showOpponentPieces={preferences.showOpponentPieces}
                  pieceShapeMode={preferences.pieceShapeMode}
                  pieceColors={preferences.pieceColors}
                  className="max-w-2xl mx-auto"
                />

                {/* Settings Link */}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    {t('configureBoardAppearance')}
                  </button>
                </div>
              </div>
            </div>

            {/* Game Status */}
            {gameStatus !== 'in_progress' && (
              <div className="mt-6 text-center">
                <div className="mb-3">
                  <p className="text-base font-semibold text-foreground mb-1">{t('gameOver')}</p>
                  <p className="text-sm text-muted-foreground">
                    {gameStatus === 'checkmate' && t('checkmate')}
                    {gameStatus === 'stalemate' && t('stalemate')}
                    {gameStatus === 'draw' && t('draw')}
                  </p>
                </div>
                {playerResult && (
                  <div className="mt-3">
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
              </div>
            )}

            {/* Move Input */}
            {gameStatus === 'in_progress' && (
              <div className="mt-6 px-4">
                {isPlayerTurn ? (
                  <div>
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
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">
                    {isLoading ? t('aiThinking') : t('yourMove')}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons and Settings */}
            {gameStatus === 'in_progress' && (
              <div className="mt-4 pb-4 px-4">
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleUndo}
                    disabled={moves.length < 2}
                    className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 flex items-center gap-2"
                  >
                    <UndoIcon className="w-4 h-4" />
                    {t('undo')}
                  </button>
                  <button
                    onClick={handleResign}
                    className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center gap-2"
                  >
                    <FlagIcon className="w-4 h-4" />
                    {t('resign')}
                  </button>
                </div>

                {/* Control Settings Link */}
                <div className="mt-2 text-center">
                  <button
                    onClick={() => setShowControlSettingsModal(true)}
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    {t('configureInputMethod')}
                  </button>
                </div>
              </div>
            )}

            {/* New Game Button */}
            {gameStatus !== 'in_progress' && (
              <div className="mt-4 pb-4 flex justify-center">
                <button
                  onClick={() => (window.location.href = `/${locale}/game/new`)}
                  className="px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90"
                >
                  {t('newGame')}
                </button>
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
              <div className="p-4 max-h-96 overflow-y-auto font-mono">
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
                  <div className="mt-4 flex justify-center gap-1">
                    <button
                      onClick={navigateToStart}
                      className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded transition-colors font-mono"
                      aria-label="Go to start"
                      style={{ fontSize: '24px' }}
                    >
                      «
                    </button>
                    <button
                      onClick={navigatePrevious}
                      className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono"
                      aria-label="Previous move"
                      disabled={
                        currentPosition === -2 || (currentPosition === -1 && moves.length === 0)
                      }
                      style={{ fontSize: '24px' }}
                    >
                      ‹
                    </button>
                    <button
                      onClick={navigateNext}
                      className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono"
                      aria-label="Next move"
                      disabled={currentPosition === -1}
                      style={{ fontSize: '24px' }}
                    >
                      ›
                    </button>
                    <button
                      onClick={navigateToEnd}
                      className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded transition-colors font-mono"
                      aria-label="Go to end"
                      style={{ fontSize: '24px' }}
                    >
                      »
                    </button>
                  </div>
                )}

                {/* Copy PGN Button */}
                {moves.length > 0 && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => {
                        const pgnText = formattedPgn
                          .map((move) => {
                            const moveNumber = `${move.moveNumber}.`;
                            const movePair = move.blackMove
                              ? `${moveNumber} ${move.whiteMove} ${move.blackMove}`
                              : `${moveNumber} ${move.whiteMove}`;
                            return movePair;
                          })
                          .join(' ');

                        navigator.clipboard.writeText(pgnText).then(() => {
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        });
                      }}
                      className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors duration-150 flex items-center gap-2 text-sm"
                    >
                      {isCopied ? (
                        <>
                          <FaCheck className="w-3 h-3 text-green-500" />
                          {t('copied') || 'Copied!'}
                        </>
                      ) : (
                        <>
                          <FaCopy className="w-3 h-3" />
                          {t('copyPgn')}
                        </>
                      )}
                    </button>
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
              <button
                onClick={() => setShowResignConfirm(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmResign}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {t('confirmResign')}
              </button>
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
              <button
                onClick={() => setShowUndoConfirm(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmUndo}
                className="px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90"
              >
                {t('confirmUndo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <GameSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        playerSide={playerSide}
      />

      {/* Control Settings Modal */}
      <ControlSettingsModal
        isOpen={showControlSettingsModal}
        onClose={() => setShowControlSettingsModal(false)}
      />
    </div>
  );
}
