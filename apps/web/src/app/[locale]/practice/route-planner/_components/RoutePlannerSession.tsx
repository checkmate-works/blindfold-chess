'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import type { PieceSymbol } from 'chess.js';
import {
  FaArrowRight,
  FaChevronDown,
  FaChevronRight,
  FaFlagCheckered,
  FaRedo,
  FaUndo,
} from 'react-icons/fa';

import { BoardTheme } from '@/lib/boardThemes';

import { CoordinateInput } from '@/app/[locale]/_components/CoordinateInput';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeComplete } from '@/app/[locale]/practice/_components/PracticeComplete';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';
import { QuitConfirmModal } from '@/app/[locale]/practice/_components/QuitConfirmModal';

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
  mode?: 'standard' | 'tutorial';
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

  const { preferences } = useGamePreferences(); // Keep if needed for other prefs
  const router = useRouter();

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

  // Initialize first problem on mount
  useEffect(() => {
    if (!problem && gameState === 'playing') {
      startNewProblem();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetInput = useCallback(() => {
    setSelectedFile(null);
    setSelectedRank(null);
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
        message: validation.error === 'Path does not end at goal' ? t('badEnd') : t('badMove'),
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

  const handleNextProblem = useCallback(() => {
    // Commit result
    if (result && problem) {
      setResults((prev) => [
        ...prev,
        {
          piece: problem.piece,
          start: problem.start,
          end: problem.end,
          success: result.success,
          userPath: result.message === t('skipped') ? [] : moves,
          shortestPath: result.shortestPath,
          skipped: result.message === t('skipped'),
        },
      ]);
    }

    const nextIndex = currentProblemIndex + 1;
    if (nextIndex < problemCount) {
      setCurrentProblemIndex(nextIndex);
      startNewProblem();
    } else {
      setGameState('summary');
    }
  }, [currentProblemIndex, problemCount, result, startNewProblem, problem, t, moves]);

  const handleRestartSession = useCallback(() => {
    if (mode === 'tutorial') {
      setCurrentProblemIndex(0);
      setResults([]);
      startNewProblem();
      return;
    }
    setCurrentProblemIndex(0);
    setResults([]);
    startNewProblem();
  }, [startNewProblem, mode]);

  const handleQuit = useCallback(() => {
    setShowQuitModal(true);
  }, []);

  const confirmQuit = useCallback(() => {
    setShowQuitModal(false);

    // If we have a pending result (user finished problem but didn't click next), commit it
    if (gameState === 'result' && result && problem) {
      setResults((prev) => [
        ...prev,
        {
          piece: problem.piece,
          start: problem.start,
          end: problem.end,
          success: result.success,
          userPath: result.message === t('skipped') ? [] : moves,
          shortestPath: result.shortestPath,
          skipped: result.message === t('skipped'),
        },
      ]);
    }

    setGameState('summary');
  }, [gameState, result, problem, moves, t]);

  // Derived sets for CoordinateInput
  const selectedFilesSet = selectedFile ? new Set([selectedFile]) : new Set<string>();
  const selectedRanksSet = selectedRank ? new Set([selectedRank]) : new Set<string>();

  if (gameState === 'summary') {
    const score = results.filter((r) => r.success).length;
    return (
      <div className="max-w-4xl mx-auto">
        <PracticeComplete
          score={score}
          total={results.length}
          onTryAgain={handleRestartSession}
          onExit={
            mode === 'tutorial' ? () => router.push(`/${locale}/practice/route-planner`) : undefined
          }
          locale={locale as Locale}
          labels={{
            practiceComplete:
              mode === 'tutorial' ? t('tutorial.complete') : tPractice('practiceComplete'),
            score: tPractice('score'),
            tryAgain: mode === 'tutorial' ? t('tutorial.restart') : tPractice('tryAgain'),
            morePractice: mode === 'tutorial' ? t('tutorial.finish') : tPractice('morePractice'),
          }}
          relatedModule={
            mode === 'tutorial'
              ? undefined
              : {
                  href: '/practice/board-symmetry', // Suggest Board Symmetry?
                  icon: '🦋',
                  title: tPractice('boardSymmetry.title'),
                  description: tPractice('boardSymmetry.description'),
                }
          }
        >
          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground mb-4">
                {tPractice('problemDetails')}
              </h3>
              <ResultList
                results={results}
                boardTheme={preferences.boardTheme}
                labels={{
                  correct: t('correct'),
                  badEnd: t('badEnd'),
                  badMove: t('badMove'),
                  shortestPath: t('shortestPath'),
                  yourPath: t('yourPath'),
                  skipped: t('skip'),
                }}
              />
            </div>
          )}
        </PracticeComplete>
      </div>
    );
  }

  if (!problem) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div
        id="route-planner-session"
        className="bg-card border border-border rounded-lg p-6 space-y-6"
      >
        {problemCount > 1 && <ProgressBar current={currentProblemIndex + 1} total={problemCount} />}

        <div className="flex justify-between items-center border-b border-border pb-4">
          <div className="flex items-center gap-6">
            <div className="bg-primary/10 p-2 rounded-lg text-primary w-14 h-14 flex items-center justify-center border border-primary/20">
              <ChessPiece type={problem.piece.toLowerCase() as PieceSymbol} color="w" size={32} />
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
                {['K', 'Q', 'R', 'B', 'N'].map((piece) => (
                  <button
                    key={piece}
                    disabled
                    className={`w-9 h-9 flex items-center justify-center rounded-md font-bold text-lg transition-colors border ${
                      problem.piece === piece
                        ? 'bg-primary text-primary-foreground border-primary opacity-100'
                        : 'bg-background border-border opacity-50'
                    }`}
                  >
                    <ChessPiece type={piece.toLowerCase() as PieceSymbol} color="w" size={24} />
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
                  <div className="flex flex-wrap gap-1">
                    {result.shortestPath.map((sq, i) => (
                      <span
                        key={i}
                        className="font-mono text-sm bg-background px-2 py-1 rounded border border-border"
                      >
                        {sq}
                      </span>
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
                  path={moves}
                  boardTheme={preferences.boardTheme}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleNextProblem} variant="primary" className="flex-1">
                <FaRedo className="mr-2" />
                {currentProblemIndex < problemCount - 1 ? t('nextProblem') : t('finish')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quit Link outside the card */}
      <div className="flex flex-col items-center gap-2">
        {gameState === 'playing' && (
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t('skip')}
          </button>
        )}
        <button
          onClick={handleQuit}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
          {t('quit')}
        </button>
      </div>

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
    </div>
  );
}

function ResultList({
  results,
  boardTheme,
  labels,
}: {
  results: RoutePlannerResult[];
  boardTheme: BoardTheme;
  labels: {
    correct: string;
    badEnd: string;
    badMove: string;
    shortestPath: string;
    yourPath: string;
    skipped: string;
  };
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="space-y-3">
      {results.map((result, index) => {
        const isExpanded = expandedIndex === index;
        return (
          <div key={index} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleExpand(index)}
              className="w-full flex items-center justify-between p-3 bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-muted-foreground">
                  {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                </div>
                <div className="font-mono text-sm text-muted-foreground w-8">#{index + 1}</div>
                <ChessPiece type={result.piece.toLowerCase() as PieceSymbol} color="w" size={20} />
                <div className="flex items-center gap-2 font-mono font-bold">
                  <span>{result.start}</span>
                  <FaArrowRight size={10} className="text-muted-foreground" />
                  <span>{result.end}</span>
                </div>
              </div>
              <div
                className={`text-sm font-bold ${result.success ? 'text-green-600' : result.skipped ? 'text-muted-foreground' : 'text-red-600'}`}
              >
                {result.success ? 'OK' : result.skipped ? labels.skipped : 'NG'}
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 bg-muted/30 border-t border-border space-y-4">
                <div className="flex justify-center">
                  <div className="w-64">
                    <RoutePlannerBoard
                      startSquare={result.start}
                      targetSquare={result.end}
                      piece={result.piece}
                      path={result.userPath}
                      boardTheme={boardTheme}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {!result.skipped && (
                    <div className="flex justify-between items-center p-2 rounded bg-background border border-border">
                      <span className="text-muted-foreground">{labels.yourPath}</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {result.userPath.map((sq, i) => (
                          <span
                            key={i}
                            className={`font-mono px-1.5 py-0.5 rounded ${result.shortestPath.includes(sq) ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}
                          >
                            {sq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {!result.success && (
                    <div className="flex justify-between items-center p-2 rounded bg-background border border-border">
                      <span className="text-muted-foreground">{labels.shortestPath}</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {result.shortestPath.map((sq, i) => (
                          <span key={i} className="font-mono px-1.5 py-0.5 rounded bg-muted">
                            {sq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
