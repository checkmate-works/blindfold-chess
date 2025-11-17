'use client';

import { type ReactElement, useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button, ChessBoard, InfoModal, ProgressBar } from '@/app/_components';
import { Chess } from 'chess.js';
import {
  FaCheck,
  FaChevronDown,
  FaCopy,
  FaEye,
  FaEyeSlash,
  FaInfoCircle,
  FaQuestionCircle,
  FaStar,
} from 'react-icons/fa';

import type { AlgebraicNotation } from '@/lib/types';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { MoveInput } from '@/app/[locale]/play/_components/MoveInput';
import { getChessEngine } from '@/app/[locale]/play/_lib/chess-engine';
import { formatPgnToText } from '@/app/[locale]/play/_lib/pgn-parser';

type Props = {
  locale: Locale;
  pgn: string;
  playerColor: 'white' | 'black';
  autoOpponent: boolean;
  initialOffset?: number;
};

type MoveLogEntry = {
  moveNumber: number;
  isWhiteMove: boolean;
  move: string;
  status: 'correct' | 'incorrect' | 'auto'; // correct: 正解, incorrect: 間違い, auto: 自動入力
  incorrectMove?: string; // 間違えた場合のユーザーの入力
  evaluation?: {
    score: number;
    mate?: number;
    text: string; // 最善です, 好手です, etc.
    loss: number; // Evaluation loss from this move (centipawns)
  };
};

// Helper function to get evaluation text based on evaluation loss
// loss is the absolute difference from the previous position (always positive)
function getEvaluationText(t: (key: string) => string, loss: number): string {
  if (loss <= 20) return t('evalBest');
  if (loss <= 50) return t('evalGood');
  if (loss <= 100) return t('evalInaccuracy');
  if (loss <= 300) return t('evalMistake');
  return t('evalBlunder');
}

// Helper function to get evaluation icon based on evaluation loss (chess.com style)
function getEvaluationIcon(loss: number, isMate: boolean = false): ReactElement | null {
  if (isMate) {
    // Checkmate - star (same as best move)
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
        <FaStar className="w-2 h-2 text-white" />
      </span>
    );
  }

  if (loss <= 20) {
    // Best move - star with green background
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
        <FaStar className="w-2 h-2 text-white" />
      </span>
    );
  }
  if (loss <= 50) {
    // Good move - checkmark with green background and white text
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
        <FaCheck className="w-2 h-2 text-white" />
      </span>
    );
  }
  if (loss <= 100) {
    // Inaccuracy - ?! with yellow background
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500 text-white text-[10px] font-bold">
        ?!
      </span>
    );
  }
  if (loss <= 300) {
    // Mistake - ? with orange background
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold">
        ?
      </span>
    );
  }
  // Blunder - ?? with red background
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
      ??
    </span>
  );
}

// Cache for position evaluations to avoid re-evaluating the same position
const evaluationCache = new Map<string, { score: number; mate?: number }>();

// Helper function to get evaluation from engine
async function getPositionEvaluation(
  moves: AlgebraicNotation[],
  moveIndex: number,
  t: (key: string) => string,
  previousEval?: { score: number; mate?: number } // Pass previous evaluation to avoid re-calculation
): Promise<
  | {
      score: number;
      mate?: number;
      text: string;
      loss: number; // Evaluation loss from this move
    }
  | undefined
> {
  try {
    const engine = getChessEngine();

    // Wait for engine to be ready
    let retries = 0;
    const maxRetries = 50; // 5 seconds max
    while (!engine.isReady && retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }

    if (!engine.isReady) {
      return undefined;
    }

    // Get evaluation BEFORE the move (use cached value if available)
    let evalBefore: { score: number; mate?: number };

    if (previousEval) {
      // Use the previous evaluation (which is the position before this move)
      evalBefore = previousEval;
    } else {
      // First move - evaluate the starting position
      const chessBefore = new Chess();
      for (let i = 0; i < moveIndex; i++) {
        chessBefore.move(moves[i]);
      }
      const fenBefore = chessBefore.fen();

      // Check cache
      if (evaluationCache.has(fenBefore)) {
        evalBefore = evaluationCache.get(fenBefore)!;
      } else {
        evalBefore = await engine.getEvaluation(fenBefore, 12);
        evaluationCache.set(fenBefore, evalBefore);
      }
    }

    // Get evaluation AFTER the move
    const chessAfter = new Chess();
    for (let i = 0; i <= moveIndex; i++) {
      chessAfter.move(moves[i]);
    }
    const fenAfter = chessAfter.fen();

    let evalAfter: { score: number; mate?: number };
    if (evaluationCache.has(fenAfter)) {
      evalAfter = evaluationCache.get(fenAfter)!;
    } else {
      evalAfter = await engine.getEvaluation(fenAfter, 12);
      evaluationCache.set(fenAfter, evalAfter);
    }

    // Calculate evaluation loss
    // For white's move: loss = evalBefore - evalAfter (positive means worse for white)
    // For black's move: loss = evalAfter - evalBefore (positive means worse for black)
    const isWhiteMove = moveIndex % 2 === 0;
    let loss: number;

    if (evalAfter.mate !== undefined) {
      // If there's a mate, consider it a best move (0 loss)
      loss = 0;
    } else if (evalBefore.mate !== undefined) {
      // If we had a mate and lost it, that's a big blunder
      loss = 1000;
    } else {
      // Normal case: calculate centipawn loss
      if (isWhiteMove) {
        // White wants higher scores, so loss = before - after
        loss = evalBefore.score - evalAfter.score;
      } else {
        // Black wants lower scores, so loss = after - before
        loss = evalAfter.score - evalBefore.score;
      }
      // Ensure loss is non-negative
      loss = Math.max(0, loss);
    }

    return {
      score: evalAfter.score,
      mate: evalAfter.mate,
      text: getEvaluationText(t, loss),
      loss,
    };
  } catch (error) {
    // Silently handle evaluation errors (e.g., timeout in background tabs)
    // This is expected behavior and doesn't affect the core postmortem functionality
    if (error instanceof Error && error.message !== 'Evaluation timeout') {
      console.warn('Evaluation skipped:', error.message);
    }
  }
  return undefined;
}

export function PostmortemClient({
  locale,
  pgn,
  playerColor,
  autoOpponent: initialAutoOpponent,
  initialOffset = 0,
}: Props) {
  const t = useTranslations('postmortem');
  const router = useRouter();
  const { preferences } = useGamePreferences();

  // Parse PGN to get original moves
  const [originalMoves, setOriginalMoves] = useState<AlgebraicNotation[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(initialOffset);
  const [userMoves, setUserMoves] = useState<AlgebraicNotation[]>([]);
  const [moveInput, setMoveInput] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [autoOpponent, setAutoOpponent] = useState(initialAutoOpponent);
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showEvalInfo, setShowEvalInfo] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Parse PGN on mount and clear evaluation cache
  useEffect(() => {
    // Clear evaluation cache when component mounts or pgn changes
    evaluationCache.clear();

    try {
      const chess = new Chess();
      // Remove move numbers and periods from PGN
      const cleanPgn = pgn.replace(/\d+\.\s*/g, '').replace(/\.\./g, '');
      const moves = cleanPgn.trim().split(/\s+/).filter(Boolean);

      // Validate moves
      const validMoves: AlgebraicNotation[] = [];
      for (const move of moves) {
        const result = chess.move(move);
        if (result) {
          validMoves.push(move as AlgebraicNotation);
        } else {
          break;
        }
      }

      setOriginalMoves(validMoves);

      // Restore moves from offset
      if (initialOffset > 0 && initialOffset <= validMoves.length) {
        const restoredMoves = validMoves.slice(0, initialOffset);
        setUserMoves(restoredMoves);
      }
    } catch (error) {
      console.error('Error parsing PGN:', error);
    }
  }, [pgn, initialOffset]);

  // Get current FEN for board display
  const getCurrentFen = useCallback(() => {
    const chess = new Chess();
    for (let i = 0; i < userMoves.length; i++) {
      chess.move(userMoves[i]);
    }
    return chess.fen();
  }, [userMoves]);

  // Check if current move is player's turn
  const isPlayerTurn = useCallback(() => {
    // If autoOpponent is disabled, player enters all moves
    if (!autoOpponent) return true;

    const isWhiteTurn = currentMoveIndex % 2 === 0;
    return (playerColor === 'white' && isWhiteTurn) || (playerColor === 'black' && !isWhiteTurn);
  }, [currentMoveIndex, playerColor, autoOpponent]);

  // Update URL with current offset
  useEffect(() => {
    if (originalMoves.length > 0 && currentMoveIndex > 0) {
      const params = new URLSearchParams(window.location.search);
      params.set('offset', currentMoveIndex.toString());
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentMoveIndex, originalMoves.length]);

  // Auto-fill opponent's move if needed
  useEffect(() => {
    if (
      autoOpponent &&
      !isPlayerTurn() &&
      currentMoveIndex < originalMoves.length &&
      !isCompleted &&
      !isEvaluating // Don't auto-fill while evaluating
    ) {
      const autoFillMove = async () => {
        setIsEvaluating(true);
        // Auto-fill opponent's move
        const opponentMove = originalMoves[currentMoveIndex];
        const moveNumber = Math.floor(currentMoveIndex / 2) + 1;
        const isWhiteMove = currentMoveIndex % 2 === 0;
        const newIndex = currentMoveIndex + 1;

        setUserMoves((prev) => [...prev, opponentMove]);
        setCurrentMoveIndex(newIndex);

        // Get evaluation if enabled
        // Get previous evaluation from the last log entry (if exists)
        const previousEval =
          moveLog.length > 0 && moveLog[moveLog.length - 1].evaluation
            ? {
                score: moveLog[moveLog.length - 1].evaluation!.score,
                mate: moveLog[moveLog.length - 1].evaluation!.mate,
              }
            : undefined;

        const evaluation = showEvaluation
          ? await getPositionEvaluation(originalMoves, currentMoveIndex, t, previousEval)
          : undefined;

        // Add to log as auto-filled (opponent's move)
        setMoveLog((prev) => [
          ...prev,
          {
            moveNumber,
            isWhiteMove,
            move: opponentMove,
            status: 'auto',
            evaluation,
          },
        ]);

        // Check if completed after auto-fill
        if (newIndex >= originalMoves.length) {
          setIsCompleted(true);
        }

        setIsEvaluating(false);
      };

      autoFillMove();
    }
  }, [
    autoOpponent,
    isPlayerTurn,
    currentMoveIndex,
    originalMoves,
    isCompleted,
    isEvaluating,
    showEvaluation,
    t,
  ]);

  // Handle move submission
  const handleSubmitMove = useCallback(
    async (move: AlgebraicNotation) => {
      if (isEvaluating) return; // Prevent submission while evaluating

      const expectedMove = originalMoves[currentMoveIndex];
      const moveNumber = Math.floor(currentMoveIndex / 2) + 1;
      const isWhiteMove = currentMoveIndex % 2 === 0;

      if (move === expectedMove) {
        setIsEvaluating(true);

        // Correct move
        const newIndex = currentMoveIndex + 1;
        setUserMoves((prev) => [...prev, move]);
        setCurrentMoveIndex(newIndex);
        setMoveInput('');

        // Get evaluation if enabled
        // Get previous evaluation from the last log entry (if exists)
        const previousEval =
          moveLog.length > 0 && moveLog[moveLog.length - 1].evaluation
            ? {
                score: moveLog[moveLog.length - 1].evaluation!.score,
                mate: moveLog[moveLog.length - 1].evaluation!.mate,
              }
            : undefined;

        const evaluation = showEvaluation
          ? await getPositionEvaluation(originalMoves, currentMoveIndex, t, previousEval)
          : undefined;

        // Add to log
        setMoveLog((prev) => [
          ...prev,
          {
            moveNumber,
            isWhiteMove,
            move,
            status: 'correct',
            evaluation,
          },
        ]);

        // Check if completed
        if (newIndex >= originalMoves.length) {
          setIsCompleted(true);
        }

        setIsEvaluating(false);
      } else {
        // Incorrect move - add to log but don't advance
        setMoveLog((prev) => [
          ...prev,
          {
            moveNumber,
            isWhiteMove,
            move: expectedMove, // Show the correct move
            status: 'incorrect',
            incorrectMove: move, // Store the incorrect move user entered
          },
        ]);
      }
    },
    [currentMoveIndex, originalMoves, showEvaluation, isEvaluating, t]
  );

  // Handle "I don't know" button
  const handleDontKnow = useCallback(async () => {
    if (isEvaluating) return; // Prevent action while evaluating

    setIsEvaluating(true);

    const correctMove = originalMoves[currentMoveIndex];
    const moveNumber = Math.floor(currentMoveIndex / 2) + 1;
    const isWhiteMove = currentMoveIndex % 2 === 0;
    const newIndex = currentMoveIndex + 1;

    setUserMoves((prev) => [...prev, correctMove]);
    setCurrentMoveIndex(newIndex);
    setMoveInput('');

    // Get evaluation if enabled
    const evaluation = showEvaluation
      ? await getPositionEvaluation(originalMoves, currentMoveIndex, t)
      : undefined;

    // Add to log as auto-filled
    setMoveLog((prev) => [
      ...prev,
      {
        moveNumber,
        isWhiteMove,
        move: correctMove,
        status: 'auto',
        evaluation,
      },
    ]);

    // Check if completed
    if (newIndex >= originalMoves.length) {
      setIsCompleted(true);
    }

    setIsEvaluating(false);
  }, [currentMoveIndex, originalMoves, showEvaluation, isEvaluating, t]);

  // Handle back to game
  const handleBackToGame = useCallback(() => {
    router.push(`/${locale}/play`);
  }, [router, locale]);

  const currentFen = getCurrentFen();
  const totalMoves = originalMoves.length;
  const progress = currentMoveIndex;

  // Format moves for display (like in PlayClient)
  const getFormattedPgn = useCallback(() => {
    const formatted: { moveNumber: number; whiteMove: string; blackMove?: string }[] = [];
    for (let i = 0; i < userMoves.length; i += 2) {
      formatted.push({
        moveNumber: Math.floor(i / 2) + 1,
        whiteMove: userMoves[i],
        blackMove: userMoves[i + 1],
      });
    }
    return formatted;
  }, [userMoves]);

  const formattedPgn = getFormattedPgn();

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
              <div className="p-4">
                <ChessBoard
                  fen={currentFen}
                  flipped={playerColor === 'black'}
                  playerSide={playerColor}
                  showCoordinates={preferences.showCoordinates}
                  showOwnPieces={preferences.showOwnPieces}
                  showOpponentPieces={preferences.showOpponentPieces}
                  pieceShapeMode={preferences.pieceShapeMode}
                  pieceColors={preferences.pieceColors}
                  boardTheme={preferences.boardTheme}
                  className="max-w-2xl mx-auto"
                />
              </div>
            </div>
          </div>

          {/* Progress Bar, Input, Actions - White background like play screen */}
          <div className="mt-6 bg-card rounded-lg shadow-lg p-4">
            {/* Progress Bar */}
            <div className="mb-6">
              <ProgressBar current={progress} total={totalMoves} />
            </div>

            {!isCompleted ? (
              <>
                {/* Loading indicator during evaluation */}
                {isEvaluating && (
                  <div className="mb-4 text-center text-muted-foreground text-sm">
                    {t('evaluating')}...
                  </div>
                )}

                {/* Move Input */}
                <div className="mb-4">
                  <div>
                    <MoveInput
                      value={moveInput}
                      onChange={(value) => {
                        setMoveInput(value);
                      }}
                      onSubmit={handleSubmitMove}
                      disabled={isEvaluating}
                      placeholder={t('inputMove')}
                      showSuggestions={preferences.enableAutoComplete}
                      showSubmitButton={true}
                    />
                  </div>
                </div>

                {/* Action Buttons and Settings */}
                <div className="pb-2">
                  {/* I don't know button */}
                  <div className="flex gap-2 justify-center mb-4">
                    <Button
                      variant="secondary"
                      onClick={handleDontKnow}
                      icon={<FaQuestionCircle className="w-4 h-4" />}
                      disabled={isEvaluating}
                      className="px-4 py-2"
                    >
                      {t('dontKnow')}
                    </Button>
                  </div>

                  {/* Settings checkboxes */}
                  <div className="flex flex-col gap-2 mb-4">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoOpponent}
                        onChange={(e) => setAutoOpponent(e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <span className="text-sm text-muted-foreground">
                        {t('autoOpponentMoves')}
                      </span>
                    </label>
                    <div className="inline-flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showEvaluation}
                          onChange={(e) => setShowEvaluation(e.target.checked)}
                          className="w-4 h-4 rounded border-border"
                        />
                        <span className="text-sm text-muted-foreground">{t('showEvaluation')}</span>
                      </label>
                      <button
                        onClick={() => setShowEvalInfo(true)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label="Evaluation information"
                      >
                        <FaInfoCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Move Log */}
                  {moveLog.length > 0 && (
                    <div className="mt-4 p-3 bg-muted/30 rounded-md max-h-48 overflow-y-auto">
                      <div className="font-mono text-sm">
                        {[...moveLog].reverse().map((entry, index) => {
                          const moveNotation = entry.isWhiteMove
                            ? `${entry.moveNumber}. ${entry.move}`
                            : `${entry.moveNumber}... ${entry.move}`;

                          if (entry.status === 'correct') {
                            return (
                              <div key={moveLog.length - 1 - index} className="mb-2">
                                <div className="text-green-600 dark:text-green-400">
                                  {moveNotation} <FaCheck className="inline w-3 h-3" />
                                </div>
                                {entry.evaluation && (
                                  <div className="text-muted-foreground text-xs ml-4 flex items-center gap-1 mt-1">
                                    {getEvaluationIcon(
                                      entry.evaluation.loss,
                                      entry.evaluation.mate !== undefined
                                    )}
                                    <span>
                                      {entry.evaluation.text} (
                                      {entry.evaluation.mate
                                        ? `#${entry.evaluation.mate}`
                                        : (entry.evaluation.score / 100).toFixed(2)}
                                      )
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          } else if (entry.status === 'incorrect') {
                            return (
                              <div
                                key={moveLog.length - 1 - index}
                                className="text-red-600 dark:text-red-400 mb-2"
                              >
                                {entry.incorrectMove
                                  ? `${entry.isWhiteMove ? `${entry.moveNumber}. ` : `${entry.moveNumber}... `}${entry.incorrectMove} ${t('logIncorrect')}`
                                  : `${moveNotation} ${t('logIncorrect')}`}
                              </div>
                            );
                          } else {
                            // auto
                            return (
                              <div key={moveLog.length - 1 - index} className="mb-2">
                                <div className="text-muted-foreground">{moveNotation}</div>
                                {entry.evaluation && (
                                  <div className="text-muted-foreground text-xs ml-4 flex items-center gap-1 mt-1">
                                    {getEvaluationIcon(
                                      entry.evaluation.loss,
                                      entry.evaluation.mate !== undefined
                                    )}
                                    <span>
                                      {entry.evaluation.text} (
                                      {entry.evaluation.mate
                                        ? `#${entry.evaluation.mate}`
                                        : (entry.evaluation.score / 100).toFixed(2)}
                                      )
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Completion Message */
              <div className="pb-2">
                <div className="py-8 text-center">
                  <FaCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">{t('completed')}</h3>
                  <p className="text-muted-foreground">{t('completedMessage')}</p>
                </div>

                {/* Move Log - also show when completed */}
                {moveLog.length > 0 && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-md max-h-48 overflow-y-auto">
                    <div className="font-mono text-sm">
                      {[...moveLog].reverse().map((entry, index) => {
                        const moveNotation = entry.isWhiteMove
                          ? `${entry.moveNumber}. ${entry.move}`
                          : `${entry.moveNumber}... ${entry.move}`;

                        if (entry.status === 'correct') {
                          return (
                            <div key={moveLog.length - 1 - index} className="mb-2">
                              <div className="text-green-600 dark:text-green-400">
                                {moveNotation} <FaCheck className="inline w-3 h-3" />
                              </div>
                              {entry.evaluation && (
                                <div className="text-muted-foreground text-xs ml-4 flex items-center gap-1 mt-1">
                                  {getEvaluationIcon(
                                    entry.evaluation.loss,
                                    entry.evaluation.mate !== undefined
                                  )}
                                  <span>
                                    {entry.evaluation.text} (
                                    {entry.evaluation.mate
                                      ? `#${entry.evaluation.mate}`
                                      : (entry.evaluation.score / 100).toFixed(2)}
                                    )
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        } else if (entry.status === 'incorrect') {
                          return (
                            <div
                              key={moveLog.length - 1 - index}
                              className="text-red-600 dark:text-red-400 mb-2"
                            >
                              {entry.incorrectMove
                                ? `${entry.isWhiteMove ? `${entry.moveNumber}. ` : `${entry.moveNumber}... `}${entry.incorrectMove} ${t('logIncorrect')}`
                                : `${moveNotation} ${t('logIncorrect')}`}
                            </div>
                          );
                        } else {
                          // auto
                          return (
                            <div key={moveLog.length - 1 - index} className="mb-2">
                              <div className="text-muted-foreground">{moveNotation}</div>
                              {entry.evaluation && (
                                <div className="text-muted-foreground text-xs ml-4 flex items-center gap-1 mt-1">
                                  {getEvaluationIcon(
                                    entry.evaluation.loss,
                                    entry.evaluation.mate !== undefined
                                  )}
                                  <span>
                                    {entry.evaluation.text} (
                                    {entry.evaluation.mate
                                      ? `#${entry.evaluation.mate}`
                                      : (entry.evaluation.score / 100).toFixed(2)}
                                    )
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Move List */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow-lg">
            {/* Moves Header */}
            <div className="px-4 py-3 bg-muted/30 rounded-t-lg">
              <span className="text-foreground font-medium">{t('moves')}</span>
            </div>

            {/* Moves Content */}
            <div className="p-4 max-h-[70vh] overflow-y-auto font-mono">
              {formattedPgn.length > 0 ? (
                <div className="space-y-0.5">
                  {formattedPgn.map((move, index) => (
                    <div key={move.moveNumber} className="flex items-center text-sm">
                      <span className="w-10 text-right pr-2 text-muted-foreground">
                        {move.moveNumber}.
                      </span>
                      <span className="flex-1 px-2 py-0.5">{move.whiteMove}</span>
                      <span className="flex-1 px-2 py-0.5">{move.blackMove || ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No moves yet</p>
              )}
            </div>

            {/* Copy PGN Button */}
            {formattedPgn.length > 0 && (
              <div className="px-4 pb-4">
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
                    const pgnText = formatPgnToText(formattedPgn);

                    navigator.clipboard.writeText(pgnText).then(() => {
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    });
                  }}
                  className="w-full"
                >
                  {isCopied ? t('copied') || 'Copied!' : t('copyPgn')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Evaluation Info Modal */}
      <InfoModal
        isOpen={showEvalInfo}
        onClose={() => setShowEvalInfo(false)}
        title={t('evalInfoTitle')}
      >
        <div className="space-y-4">
          <div>
            <p className="mb-3">{t('evalInfoDescription')}</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>{t('evalInfoPoint1')}</li>
              <li>{t('evalInfoPoint2')}</li>
              <li>{t('evalInfoPoint3')}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">{t('evalScoreMeaning')}</h3>
            <p className="text-sm text-muted-foreground">{t('evalScoreDescription')}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">{t('evalCriteriaTitle')}</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 flex-shrink-0">
                  <FaStar className="w-2.5 h-2.5 text-white" />
                </span>
                <span>
                  <strong>{t('evalBest')}</strong>: {t('evalBestCriteria')}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 flex-shrink-0">
                  <FaCheck className="w-2.5 h-2.5 text-white" />
                </span>
                <span>
                  <strong>{t('evalGood')}</strong>: {t('evalGoodCriteria')}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 text-white text-[10px] font-bold flex-shrink-0">
                  ?!
                </span>
                <span>
                  <strong>{t('evalInaccuracy')}</strong>: {t('evalInaccuracyCriteria')}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex-shrink-0">
                  ?
                </span>
                <span>
                  <strong>{t('evalMistake')}</strong>: {t('evalMistakeCriteria')}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex-shrink-0">
                  ??
                </span>
                <span>
                  <strong>{t('evalBlunder')}</strong>: {t('evalBlunderCriteria')}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </InfoModal>
    </div>
  );
}
