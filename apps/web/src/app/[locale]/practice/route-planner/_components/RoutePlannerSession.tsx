'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { FaArrowRight, FaFlagCheckered, FaRedo, FaUndo } from 'react-icons/fa';

import { CoordinateInput } from '@/app/[locale]/_components/CoordinateInput';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';
import { QuitConfirmModal } from '@/app/[locale]/practice/_components/QuitConfirmModal';
import { ScoreCounter } from '@/app/[locale]/practice/_components/ScoreCounter';

import { PracticeResultSkeleton } from '../../_components/PracticeResultSkeleton';
import {
  PIECES,
  type PieceType,
  findShortestPath,
  generateProblem,
  validateUserPath,
} from '../_lib/utils';
import { RoutePlannerBoard } from './RoutePlannerBoard';

type GameState = 'playing' | 'result' | 'summary';

type RoutePlannerResult = {
  piece: PieceType;
  start: string;
  end: string;
  success: boolean;
  userPath: string[];
  shortestPath: string[];
  skipped?: boolean;
};

type Props = {
  locale: string;
  problemCount?: number; // default 5
  allowedPieces?: PieceType[]; // default all
  mode?: 'standard' | 'tutorial' | 'training';
  initialProblem?: {
    piece: PieceType;
    start: string;
    end: string;
  };
};

export function RoutePlannerSession({
  locale,
  problemCount = 5,
  allowedPieces = [...PIECES],
  mode = 'standard',
  initialProblem,
}: Props) {
  const t = useTranslations('practice.routePlanner');
  const tPractice = useTranslations('practice');

  const { preferences } = useGamePreferences();
  const router = useRouter();
  const { showToast } = useToast();

  const isTraining = mode === 'training';

  /* State */
  const [gameState, setGameState] = useState<GameState>('playing');
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [results, setResults] = useState<RoutePlannerResult[]>([]);

  const [problem, setProblem] = useState<{
    piece: PieceType;
    start: string;
    end: string;
  } | null>(null);
  const [moves, setMoves] = useState<string[]>([]);

  const [showQuitModal, setShowQuitModal] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    shortestPath: string[];
    message?: string;
  } | null>(null);

  // Button Input State
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [hoveredPathIndex, setHoveredPathIndex] = useState<number | null>(null);
  const [lockedPathIndex, setLockedPathIndex] = useState<number | null>(null);

  const highlightedPathIndex = hoveredPathIndex ?? lockedPathIndex;

  // Initialize first problem on mount
  useEffect(() => {
    if (!problem && gameState === 'playing') {
      startNewProblem();
    }

    // Ensure scroll to top/element on mount to assist with hash navigation reliability
    // Only in standard mode (User pressed Start), not in tutorial or implicit flows
    const timer = setTimeout(() => {
      const element = document.getElementById('route-planner-session');
      if (element && (mode === 'standard' || mode === 'training')) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetInput = useCallback(() => {
    setSelectedFile(null);
    setSelectedRank(null);
    setHoveredPathIndex(null);
    setLockedPathIndex(null);
  }, []);

  const startNewProblem = useCallback(() => {
    let newProblem;
    if (mode === 'tutorial' && initialProblem && currentProblemIndex === 0) {
      newProblem = initialProblem;
    } else {
      newProblem = generateProblem(allowedPieces);
    }

    setProblem(newProblem);
    setMoves([]);
    setGameState('playing');
    setResult(null);
    resetInput();
  }, [allowedPieces, resetInput, mode, initialProblem, currentProblemIndex]);

  const attemptMoveSubmit = useCallback(
    (file: string | null, rank: string | null) => {
      if (!problem || !file || !rank) return;

      const square = `${file}${rank}`;

      // Allow even invalid moves? The user can Undo.
      // But `getPossibleMoves` is strict.
      // Let's just add it. `validateUserPath` will catch it at the end.
      setMoves((prev) => [...prev, square]);
      resetInput();
    },
    [problem, resetInput]
  );

  // Handlers for CoordinateInput
  const handleFileToggle = useCallback(
    (file: string) => {
      const newFile = file === selectedFile ? null : file;
      setSelectedFile(newFile);
      if (newFile && selectedRank) {
        attemptMoveSubmit(newFile, selectedRank);
      }
    },
    [selectedFile, selectedRank, attemptMoveSubmit]
  );

  const handleRankToggle = useCallback(
    (rank: string) => {
      const newRank = rank === selectedRank ? null : rank;
      setSelectedRank(newRank);
      if (selectedFile && newRank) {
        attemptMoveSubmit(selectedFile, newRank);
      }
    },
    [selectedFile, selectedRank, attemptMoveSubmit]
  );

  const handleUndo = useCallback(() => {
    if (moves.length === 0 || !problem) return;
    const newMoves = moves.slice(0, -1);

    setMoves(newMoves);
    resetInput();
  }, [moves, problem, resetInput]);

  const handleSubmitAnswer = useCallback(() => {
    if (!problem) return;

    // Check if the user already moved to the target
    const finalMoves = [...moves];
    if (finalMoves.length > 0 && finalMoves[finalMoves.length - 1] !== problem.end) {
      // If last move is not target, try appending target
      // Only strictly valid if it's a legal move?
      // `validateUserPath` checks legality of the full path.
      // So we just optimistically append.
      finalMoves.push(problem.end);
    } else if (finalMoves.length === 0) {
      // If no moves made, maybe they mean start -> end directly?
      // Only if that's a valid move.
      finalMoves.push(problem.end);
    }

    const validation = validateUserPath(problem.piece, problem.start, finalMoves, problem.end);
    const shortestPath = findShortestPath(problem.piece, problem.start, problem.end) || [];

    const isSuccess = validation.valid;

    // Note: We use `finalMoves` for validation, but what do we save?
    // If success, we should save `finalMoves` as the user path.
    // If fail, we probably save `finalMoves` too so they see what happened.

    // But currently we don't track per-problem history in a way that allows retry *before* moving on?
    // User requested: "submit" -> Result.
    // If we want to allow retry of the SAME problem on failure?
    // "Next Problem" implies moving on.
    // Let's assume we record result now.

    // Actually, `results` state should only be updated when moving to the *next* problem?
    // OR we record it now. If we record it now, Retrying would double count?
    // Let's say: "Next Problem" commits the result.
    // BUT we need to show Success/Fail message.

    if (isSuccess) {
      setResult({
        success: true,
        shortestPath,
        message: t('correct'),
      });
    } else {
      setResult({
        success: false,
        shortestPath,
        message: validation.error === 'Path does not end at goal' ? t('badEnd') : t('incorrect'),
      });
      // If failed, still show the path we attempted (including the appended target if any)
      // But if it was a bad move *before* the end, `validateUserPath` fails early?
      // `validateUserPath` returns valid: false.
      // We should use `finalMoves` for the visual update if we want to show "Hey, jumping to target was invalid".
      // But `validateUserPath` logic needs to be robust.
    }

    // Update moves state to reflect the implicit move for visual consistency in the result view?
    // Or just let `results` have it.
    // The `handleNextProblem` uses `moves`. We should update `moves` or pass `finalMoves` to result logic.
    // Let's update `moves` if it was successful or even if failed?
    // Actually `handleNextProblem` reads `moves`.
    // Let's rely on `result.userPath` in `handleNextProblem` which we can set here if we refactor `handleNextProblem`.
    // OR, cleaner: we don't update `moves` state (which reflects input), but we store `finalMoves` in the result object directly.
    // Wait, `handleNextProblem` constructs the history item.
    // Let's update `moves` here to be safe and showing the full path in the "Result" state UI (visual board).
    setMoves(finalMoves);

    setGameState('result');
  }, [problem, moves, t]);

  const handleSkip = useCallback(() => {
    if (!problem) return;
    const shortestPath = findShortestPath(problem.piece, problem.start, problem.end) || [];
    setResult({
      success: false,
      shortestPath,
      message: t('skipped'),
    });
    setGameState('result');
  }, [problem, t]);

  // ... (previous code)

  const handleNextProblem = useCallback(() => {
    // Commit current result if exists
    const newResults = [...results];
    if (result && problem) {
      newResults.push({
        piece: problem.piece,
        start: problem.start,
        end: problem.end,
        success: result.success,
        userPath: result.message === t('skipped') ? [] : moves,
        shortestPath: result.shortestPath,
        skipped: result.message === t('skipped'),
      });
      setResults(newResults);
    }

    if (isTraining) {
      // Training mode: always continue with a new problem
      setCurrentProblemIndex((prev) => prev + 1);
      startNewProblem();
      return;
    }

    const nextIndex = currentProblemIndex + 1;
    if (nextIndex < problemCount) {
      setCurrentProblemIndex(nextIndex);
      startNewProblem();
    } else {
      // Session Complete - Redirect to Result Page
      const dataStr = encodeURIComponent(JSON.stringify(newResults));
      const piecesStr = allowedPieces.join('');
      // Pass mode param too so result page knows if it was tutorial
      router.push(
        `/${locale}/practice/route-planner/result?data=${dataStr}&mode=${mode}&count=${problemCount}&pieces=${piecesStr}`
      );
    }
  }, [
    currentProblemIndex,
    problemCount,
    result,
    startNewProblem,
    problem,
    t,
    moves,
    results,
    router,
    locale,
    mode,
    allowedPieces,
    isTraining,
  ]);

  const handleEndTraining = useCallback(() => {
    showToast(tPractice('trainingEnded'), 'info');
    router.push(`/${locale}/practice/route-planner`);
  }, [showToast, tPractice, router, locale]);

  const handleQuit = useCallback(() => {
    setShowQuitModal(true);
  }, []);

  const confirmQuit = useCallback(() => {
    setShowQuitModal(false);

    // If we have a pending result (user finished problem but didn't click next), commit it
    const finalResults = [...results];
    if (gameState === 'result' && result && problem) {
      finalResults.push({
        piece: problem.piece,
        start: problem.start,
        end: problem.end,
        success: result.success,
        userPath: result.message === t('skipped') ? [] : moves,
        shortestPath: result.shortestPath,
        skipped: result.message === t('skipped'),
      });
      setResults(finalResults);
    }

    // Redirect to Result Page with whatever results we have
    const dataStr = encodeURIComponent(JSON.stringify(finalResults));
    const piecesStr = allowedPieces.join('');
    router.push(
      `/${locale}/practice/route-planner/result?data=${dataStr}&mode=${mode}&count=${problemCount}&pieces=${piecesStr}`
    );
  }, [
    gameState,
    result,
    problem,
    moves,
    t,
    results,
    router,
    locale,
    mode,
    problemCount,
    allowedPieces,
  ]);

  // Derived sets for CoordinateInput
  const selectedFilesSet = selectedFile ? new Set([selectedFile]) : new Set<string>();
  const selectedRanksSet = selectedRank ? new Set([selectedRank]) : new Set<string>();

  // NOTE: 'summary' gameState is effectively replaced by redirection.
  // We can keep the state definition but we won't render it here anymore.

  if (!problem) return <PracticeResultSkeleton />;

  return (
    <div className="min-h-screen max-w-2xl mx-auto space-y-4">
      <div
        id="route-planner-session"
        className="bg-card border border-border rounded-lg p-6 space-y-6"
      >
        {!isTraining && problemCount > 1 && (
          <ProgressBar current={currentProblemIndex + 1} total={problemCount} />
        )}

        {isTraining && (
          <ScoreCounter
            correct={results.filter((r) => r.success).length}
            incorrect={results.filter((r) => !r.success).length}
          />
        )}

        <div className="flex justify-between items-center border-b border-border pb-4">
          <div className="flex items-center gap-6">
            <div className="bg-primary/10 p-2 rounded-lg text-primary w-14 h-14 flex items-center justify-center border border-primary/20">
              <ChessPiece type={problem.piece} color="w" size={32} />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm text-muted-foreground">{t('startSquare')}</div>
                <div className="text-xl font-mono font-bold">{problem.start}</div>
              </div>
              <div className="text-muted-foreground pt-4">
                <FaArrowRight />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('targetSquare')}</div>
                <div className="text-xl font-mono font-bold">{problem.end}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Moves History with Undo */}
          {gameState === 'playing' && (
            <div className="flex flex-wrap gap-2 items-center min-h-[3rem] p-4 bg-muted/50 rounded-md">
              <span className="font-mono font-bold text-muted-foreground">{problem.start}</span>
              {moves.map((move, i) => (
                <div key={i} className="flex items-center">
                  <span className="text-muted-foreground mx-1">→</span>
                  <span className="font-mono font-bold bg-background px-2 py-1 rounded border border-border shadow-sm">
                    {move}
                  </span>
                </div>
              ))}

              {/* Undo Button placed right next to moves */}
              {moves.length > 0 && (
                <button
                  onClick={handleUndo}
                  className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-background hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
                  title={tPractice('undo')}
                >
                  <FaUndo size={12} />
                </button>
              )}

              <div className="flex items-center ml-2">
                <span className="text-muted-foreground mx-1">→</span>
                <span className="font-mono font-bold text-muted-foreground border border-dashed border-border px-2 py-1 rounded opacity-70">
                  {problem.end}
                </span>
              </div>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="flex flex-col gap-3 p-4 bg-card rounded-lg border border-border">
              {/* Piece Row (Read Only Indicator) */}
              <div className="flex gap-2 justify-center">
                {(['k', 'q', 'r', 'b', 'n'] as const).map((piece) => (
                  <button
                    key={piece}
                    disabled
                    className={`w-9 h-9 flex items-center justify-center rounded-md font-bold text-lg transition-colors border ${
                      problem.piece === piece
                        ? 'bg-primary text-primary-foreground border-primary opacity-100'
                        : 'bg-background border-border opacity-50'
                    }`}
                  >
                    <ChessPiece type={piece} color="w" size={24} />
                  </button>
                ))}
              </div>

              {/* File Selection */}
              <CoordinateInput
                selectedFiles={selectedFilesSet}
                onFileToggle={handleFileToggle}
                showRanks={false}
              />

              {/* Rank Selection (Always shown) */}
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <CoordinateInput
                  selectedRanks={selectedRanksSet}
                  onRankToggle={handleRankToggle}
                  showFiles={false}
                />
              </div>

              {/* Answer Action */}
              <div className="flex pt-4 border-t border-border mt-2">
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={
                    moves.length === 0 &&
                    problem.start === problem.end /* technically impossible but generic check */
                  }
                  variant="primary"
                  className="w-full"
                >
                  <FaFlagCheckered className="mr-2" />
                  {t('submit')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {gameState === 'result' && result && (
          <div className="space-y-6">
            {/* Result Message Section */}
            <div className="text-center py-2">
              <h3
                className={`text-lg font-bold mb-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}
              >
                {result.message}
              </h3>

              {!result.success && (
                <div className="mt-4 text-left p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium text-muted-foreground mb-2">{t('shortestPath')}</h4>
                  <div className="flex flex-wrap items-center gap-1">
                    {result.shortestPath.map((sq, i) => (
                      <Fragment key={i}>
                        {i > 0 && (
                          <FaArrowRight size={10} className="text-muted-foreground/50 mx-0.5" />
                        )}
                        {i === 0 || i === result.shortestPath.length - 1 ? (
                          <span className="font-mono text-sm font-bold px-1">{sq}</span>
                        ) : (
                          <button
                            className={`font-mono text-xs px-2 py-1 rounded border transition-colors cursor-pointer ${
                              highlightedPathIndex === i
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-background hover:bg-muted border-border'
                            }`}
                            onMouseEnter={() => setHoveredPathIndex(i)}
                            onMouseLeave={() => setHoveredPathIndex(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLockedPathIndex(i);
                            }}
                          >
                            {sq}
                          </button>
                        )}
                      </Fragment>
                    ))}
                  </div>
                </div>
              )}

              {result.success && <div className="mt-2 text-sm text-muted-foreground"></div>}
            </div>

            {/* Visual Board Result */}
            <div className="flex justify-center">
              <div className="w-full max-w-sm">
                <RoutePlannerBoard
                  startSquare={problem.start}
                  targetSquare={problem.end}
                  piece={problem.piece}
                  path={
                    highlightedPathIndex !== null
                      ? result.shortestPath.slice(0, highlightedPathIndex + 1)
                      : [problem.start, ...moves]
                  }
                  boardTheme={preferences.boardTheme}
                  highlightedSquare={
                    highlightedPathIndex !== null ? result.shortestPath[highlightedPathIndex] : null
                  }
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleNextProblem} variant="primary" className="flex-1">
                <FaRedo className="mr-2" />
                {isTraining
                  ? t('nextProblem')
                  : currentProblemIndex < problemCount - 1
                    ? t('nextProblem')
                    : t('finish')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quit / End Training section outside the card */}
      <div className="flex flex-col items-center gap-2">
        {gameState === 'playing' && (
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t('skip')}
          </button>
        )}
        {isTraining ? (
          <button
            onClick={handleEndTraining}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {tPractice('endTraining')}
          </button>
        ) : (
          <button
            onClick={handleQuit}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t('quit')}
          </button>
        )}
      </div>

      {!isTraining && (
        <QuitConfirmModal
          isOpen={showQuitModal}
          onConfirm={confirmQuit}
          onCancel={() => setShowQuitModal(false)}
          labels={{
            title: tPractice('quitConfirmModal.title'),
            message: tPractice('quitConfirmModal.message'),
            confirmButton: tPractice('quitConfirmModal.confirmButton'),
            cancelButton: tPractice('quitConfirmModal.cancelButton'),
          }}
        />
      )}
    </div>
  );
}
