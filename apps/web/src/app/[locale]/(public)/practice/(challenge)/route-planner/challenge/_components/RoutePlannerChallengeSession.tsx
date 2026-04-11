'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { BoardOverlay, Button } from '@/app/_components';
import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowRight, FaFlagCheckered, FaHeart, FaRegHeart, FaUndo } from 'react-icons/fa';
import { LuPause, LuPlay } from 'react-icons/lu';

import { MISTAKE_LIMIT } from '@/lib/challenge-constants';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { useTimedSession } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-timed-session';
import { saveRoutePlannerResult } from '@/app/[locale]/(public)/practice/(challenge)/route-planner/_actions/save-result';
import { AlgebraicKeyboardHint } from '@/app/[locale]/(public)/practice/_components/KeyboardHint';
import { PieceCoordinateInput } from '@/app/[locale]/(public)/practice/_components/PieceCoordinateInput';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { QuizTimer } from '@/app/[locale]/(public)/practice/_components/QuizTimer';
import { useAlgebraicKeyboardInput } from '@/app/[locale]/(public)/practice/_hooks/use-algebraic-keyboard-input';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useCoordinateInput } from '../../_hooks/use-coordinate-input';
import { PIECES, findShortestPath, generateProblem, validateUserPath } from '../../_lib/utils';
import type { PieceType } from '../../_lib/utils';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
  allowedPieces: PieceType[];
};

type ProblemResult = {
  piece: PieceType;
  start: string;
  end: string;
  success: boolean;
  userPath: string[];
  shortestPath: string[];
};

export default function RoutePlannerChallengeSession({
  locale,
  initialTimeLimit,
  allowedPieces,
}: Props) {
  const t = useTranslations('practice.routePlanner');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const quitConfirmLabels = useQuitConfirmLabels();

  const [problemResults, setProblemResults] = useState<ProblemResult[]>([]);
  const [moves, setMoves] = useState<string[]>([]);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [showQuitModal, setShowQuitModal] = useState(false);

  const piecesForGeneration = useMemo(
    () => (allowedPieces.length > 0 ? allowedPieces : [...PIECES]),
    [allowedPieces]
  );

  const generateQuestion = useCallback((): {
    piece: PieceType;
    start: string;
    end: string;
  } => {
    return generateProblem(piecesForGeneration);
  }, [piecesForGeneration]);

  const {
    currentQuestion: currentProblem,
    timeRemaining,
    totalTime,
    correctCount,
    incorrectCount,
    showFeedback,
    isFinished,
    countdown,
    isPaused,
    handleAnswer: hookHandleAnswer,
    togglePause,
  } = useTimedSession<{ piece: PieceType; start: string; end: string }>({
    timeLimit: initialTimeLimit,
    generateQuestion,
    mistakeAllowance: MISTAKE_LIMIT,
    feedbackDuration: (correct: boolean) => (correct ? 1000 : 2000),
  });

  useScrollToElement('route-planner-challenge-session');

  const timeElapsed = initialTimeLimit - timeRemaining;
  const isDisabled = showFeedback || isPaused || countdown !== null;

  // Forward refs so coordinate input can call the yet-to-be-defined game
  // callbacks without a circular hook dependency.
  const addMoveRef = useRef<(square: string) => void>(() => {});
  const handleUndoRef = useRef<() => void>(() => {});
  const movesLengthRef = useRef(0);

  const handleCoordinateComplete = useCallback((square: string) => {
    addMoveRef.current(square);
  }, []);
  const handleCoordinateUndo = useCallback(() => {
    handleUndoRef.current();
  }, []);
  const hasMovesToUndo = useCallback(() => movesLengthRef.current > 0, []);

  const {
    selectedFile,
    selectedRank,
    handleFilePress,
    handleRankPress,
    handleBackspace,
    resetInput,
  } = useCoordinateInput({
    onCoordinateComplete: handleCoordinateComplete,
    onUndo: handleCoordinateUndo,
    hasMovesToUndo,
    disabled: isDisabled,
  });

  useAlgebraicKeyboardInput({
    onFile: handleFilePress,
    onRank: handleRankPress,
    onBackspace: handleBackspace,
    enabled: !isDisabled && currentProblem !== null,
  });

  // Reset local state when currentProblem changes (new question from useTimedSession)
  const prevProblemRef = useRef(currentProblem);
  useEffect(() => {
    if (currentProblem && currentProblem !== prevProblemRef.current) {
      setMoves([]);
      setLastAnswerCorrect(null);
      resetInput();
      prevProblemRef.current = currentProblem;
    }
  }, [currentProblem, resetInput]);

  // Clear feedback state when hook feedback ends
  useEffect(() => {
    if (!showFeedback) {
      setLastAnswerCorrect(null);
    }
  }, [showFeedback]);

  const addMove = useCallback(
    (square: string) => {
      if (!currentProblem) return;
      setMoves((prev) => [...prev, square]);
    },
    [currentProblem]
  );

  const handleUndo = useCallback(() => {
    if (moves.length === 0 || !currentProblem) return;
    setMoves(moves.slice(0, -1));
    resetInput();
  }, [moves, currentProblem, resetInput]);

  addMoveRef.current = addMove;
  handleUndoRef.current = handleUndo;
  movesLengthRef.current = moves.length;

  const handleSubmitAnswer = useCallback(() => {
    if (!currentProblem || showFeedback || isPaused || countdown !== null) return;

    const finalMoves = [...moves];
    if (finalMoves.length > 0 && finalMoves[finalMoves.length - 1] !== currentProblem.end) {
      finalMoves.push(currentProblem.end);
    } else if (finalMoves.length === 0) {
      finalMoves.push(currentProblem.end);
    }

    const validation = validateUserPath(
      currentProblem.piece,
      currentProblem.start,
      finalMoves,
      currentProblem.end
    );
    const shortestPath =
      findShortestPath(currentProblem.piece, currentProblem.start, currentProblem.end) || [];

    const success = validation.valid;

    setMoves(finalMoves);
    setLastAnswerCorrect(success);

    setProblemResults((prev) => [
      ...prev,
      {
        piece: currentProblem.piece,
        start: currentProblem.start,
        end: currentProblem.end,
        success,
        userPath: finalMoves,
        shortestPath,
      },
    ]);

    hookHandleAnswer(success);
  }, [currentProblem, moves, hookHandleAnswer, showFeedback, isPaused, countdown]);

  const handleQuitRequest = useCallback(() => {
    if (!isPaused) togglePause();
    setShowQuitModal(true);
  }, [isPaused, togglePause]);

  const handleQuitConfirm = useCallback(() => {
    router.push(`/${locale}/practice/route-planner/challenge`);
  }, [router, locale]);

  const handleQuitCancel = useCallback(() => {
    setShowQuitModal(false);
    if (isPaused) togglePause();
  }, [isPaused, togglePause]);

  // Redirect on finish
  const total = correctCount + incorrectCount;
  const resultUrl = useMemo(() => {
    const dataStr = encodeURIComponent(JSON.stringify(problemResults));
    const piecesStr = allowedPieces.join('');

    const params = new URLSearchParams();
    params.set('data', dataStr);
    params.set('mode', 'standard');
    params.set('count', total.toString());
    params.set('pieces', piecesStr);
    params.set('time', timeElapsed.toString());
    if (allowedPieces.length === 1) {
      const pieceName = allowedPieces[0] === 'n' ? 'knight' : 'bishop';
      params.set('piece', pieceName);
    }

    return `/${locale}/practice/route-planner/result?${params.toString()}`;
  }, [problemResults, allowedPieces, total, locale, timeElapsed]);

  // Determine piece name for leaderboard segmentation
  const pieceName = useMemo(() => {
    if (allowedPieces.length === 1) {
      return allowedPieces[0] === 'n' ? 'knight' : 'bishop';
    }
    return 'knight'; // fallback, challenge mode always uses single piece
  }, [allowedPieces]);

  const saveResult = useCallback(
    () =>
      saveRoutePlannerResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: totalTime,
        piece: pieceName,
      }),
    [correctCount, incorrectCount, totalTime, pieceName]
  );

  useChallengeResultSave({
    isFinished,
    totalAnswers: total,
    resultUrl,
    saveResult,
    moduleName: 'route_planner',
  });

  if (!currentProblem || isFinished) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="route-planner-challenge-session" className="min-h-screen max-w-2xl mx-auto space-y-4">
      <div className="bg-card border border-border rounded-lg p-6 space-y-6 relative overflow-hidden">
        {/* Countdown Overlay */}
        <BoardOverlay
          isVisible={countdown !== null}
          className="backdrop-blur-md z-50"
          data-testid="countdown-overlay"
        >
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        {/* Pause Overlay */}
        <BoardOverlay isVisible={isPaused} className="backdrop-blur-sm bg-black/40 z-50">
          <button
            onClick={togglePause}
            className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 shadow-lg transition-all hover:scale-110 active:scale-95 pointer-events-auto"
            aria-label={tPractice('resume')}
          >
            <LuPlay size={48} className="fill-current ml-1" />
          </button>
        </BoardOverlay>

        <div
          className={`transition-all duration-300 ${isPaused || countdown !== null ? 'blur-sm' : ''}`}
        >
          {/* Header: Lives and Timer */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-1">
              {Array.from({ length: MISTAKE_LIMIT }, (_, i) => (
                <span key={i} className="text-destructive">
                  {i < MISTAKE_LIMIT - incorrectCount ? (
                    <FaHeart className="w-5 h-5" />
                  ) : (
                    <FaRegHeart className="w-5 h-5 opacity-30" />
                  )}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={togglePause}
                disabled={countdown !== null || showFeedback}
                className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                aria-label={isPaused ? tPractice('resume') : tPractice('pause')}
              >
                {isPaused ? (
                  <LuPlay size={18} className="fill-current" />
                ) : (
                  <LuPause size={18} className="fill-current" />
                )}
              </button>
              <QuizTimer
                timeRemaining={timeRemaining}
                progress={initialTimeLimit > 0 ? timeElapsed / initialTimeLimit : 0}
                size={40}
                fontSize="text-xs"
                strokeWidth={4}
              />
            </div>
          </div>

          {/* Problem Header */}
          <div className="flex justify-between items-center border-b border-border pb-4">
            <div className="flex items-center gap-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary w-14 h-14 flex items-center justify-center border border-primary/20">
                <ChessPiece type={currentProblem.piece} color="w" size={32} />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">{t('startSquare')}</div>
                  <div className="text-xl font-mono font-bold">{currentProblem.start}</div>
                </div>
                <div className="text-muted-foreground pt-4">
                  <FaArrowRight />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t('targetSquare')}</div>
                  <div className="text-xl font-mono font-bold">{currentProblem.end}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Moves History */}
            <div
              className={`flex flex-wrap gap-2 items-center min-h-[3rem] p-4 rounded-md border transition-colors duration-300 ${
                showFeedback && lastAnswerCorrect !== null
                  ? lastAnswerCorrect
                    ? 'border-success bg-success/10'
                    : 'border-destructive bg-destructive/10'
                  : 'border-transparent bg-muted/50'
              }`}
            >
              <span className="font-mono font-bold text-muted-foreground">
                {currentProblem.start}
              </span>
              {moves.map((move, i) => (
                <div key={i} className="flex items-center">
                  <span className="text-muted-foreground mx-1">&rarr;</span>
                  <span className="font-mono font-bold bg-background px-2 py-1 rounded border border-border shadow-sm">
                    {move}
                  </span>
                </div>
              ))}

              {moves.length > 0 && !showFeedback && (
                <button
                  onClick={handleUndo}
                  className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-background hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
                  title={tPractice('undo')}
                >
                  <FaUndo size={12} />
                </button>
              )}

              {!showFeedback && (
                <div className="flex items-center ml-2">
                  <span className="text-muted-foreground mx-1">&rarr;</span>
                  <span className="font-mono font-bold text-muted-foreground border border-dashed border-border px-2 py-1 rounded opacity-70">
                    {currentProblem.end}
                  </span>
                </div>
              )}
            </div>

            {/* Coordinate Input */}
            <div
              className={`transition-opacity duration-300 ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <PieceCoordinateInput
                activePiece={currentProblem.piece}
                selectedFile={selectedFile}
                selectedRank={selectedRank}
                onFileToggle={handleFilePress}
                onRankToggle={handleRankPress}
              >
                <div className="flex pt-4 border-t border-border mt-2">
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={
                      isDisabled ||
                      (moves.length === 0 && currentProblem.start === currentProblem.end)
                    }
                    variant="primary"
                    className="w-full"
                  >
                    <FaFlagCheckered className="mr-2" />
                    {t('submit')}
                  </Button>
                </div>
              </PieceCoordinateInput>
              <AlgebraicKeyboardHint disabled={isDisabled} />
            </div>
          </div>
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} />

      {/* Quit section (no Skip in challenge mode) */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleQuitRequest}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
          {tPractice('quit')}
        </button>
      </div>

      <QuitConfirmModal
        isOpen={showQuitModal}
        onConfirm={handleQuitConfirm}
        onCancel={handleQuitCancel}
        labels={quitConfirmLabels}
      />
    </div>
  );
}
