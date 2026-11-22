'use client';

import { useCallback, useRef } from 'react';

import { Button } from '@/app/_components';
import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowRight, FaFlagCheckered, FaUndo } from 'react-icons/fa';

import { TrainingFooter } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingFooter';
import { AlgebraicKeyboardHint } from '@/app/[locale]/(public)/practice/_components/KeyboardHint';
import { PieceCoordinateInput } from '@/app/[locale]/(public)/practice/_components/PieceCoordinateInput';
import { useAlgebraicKeyboardInput } from '@/app/[locale]/(public)/practice/_hooks/use-algebraic-keyboard-input';

import { useRoutePlannerGame } from '../_hooks/use-route-planner-game';
import { useStagedCoordinate } from '../_hooks/use-staged-coordinate';
import { PIECES } from '../_lib/pieces';
import type { PieceType } from '../_lib/pieces';
import { RoutePlannerPlaySkeleton } from './RoutePlannerPlaySkeleton';
import { RoutePlannerResultView } from './RoutePlannerResultView';

/**
 * The session wrapper, which `useScrollToElement` aligns to the viewport top.
 *
 * Unlike the other training sessions, this one has no spacing of its own
 * above its first row: the piece box is the very first thing inside it, so
 * aligning the wrapper's top put the box flush against the viewport edge.
 * The space that belongs above it is the PagePanel padding the wrapper sits
 * in (`p-4 sm:p-6 md:p-8`), so the scroll margin repeats those values and
 * the alignment keeps that padding on screen. Change both together.
 */
const SESSION_WRAPPER_CLASS =
  'min-h-screen max-w-md mx-auto scroll-mt-4 sm:scroll-mt-6 md:scroll-mt-8';

type Props = {
  locale: string;
  allowedPieces?: PieceType[];
  mode?: 'training';
};

export function RoutePlannerSession({
  locale,
  allowedPieces = [...PIECES],
  mode = 'training',
}: Props) {
  const t = useTranslations('practice.routePlanner');
  const tPractice = useTranslations('practice');

  const staged = useStagedCoordinate();

  const {
    gameState,
    results,
    problem,
    moves,
    result,
    handleFilePress,
    handleRankPress,
    handleBackspace,
    handleUndo,
    handleSubmitAnswer,
    handleSkip,
    handleNextProblem,
    handleEndTraining,
  } = useRoutePlannerGame({
    locale,
    allowedPieces,
    mode,
    stagedCoordinate: staged,
  });

  const isInputActive = gameState === 'playing';
  const canSubmit = moves.length > 0;
  const sessionRef = useRef<HTMLDivElement>(null);

  // Mirrors the submit button's `disabled`: Enter must not submit what the
  // button would refuse.
  const handleEnter = useCallback(() => {
    if (canSubmit) handleSubmitAnswer();
  }, [canSubmit, handleSubmitAnswer]);

  useAlgebraicKeyboardInput({
    onFile: handleFilePress,
    onRank: handleRankPress,
    onBackspace: handleBackspace,
    onEnter: handleEnter,
    containerRef: sessionRef,
    enabled: isInputActive,
  });

  if (!problem) {
    return (
      <div id="route-planner-session" className={SESSION_WRAPPER_CLASS}>
        <RoutePlannerPlaySkeleton />
      </div>
    );
  }

  return (
    <div id="route-planner-session" className={SESSION_WRAPPER_CLASS}>
      <div ref={sessionRef} className="text-center relative overflow-hidden">
        {/* Problem Header */}
        <div className="flex justify-center items-center gap-6 pb-4 mb-4">
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

        <div className="space-y-4">
          {/* Moves History with Undo */}
          {gameState === 'playing' && (
            <div className="flex flex-wrap gap-2 items-center min-h-[3rem] p-4 bg-muted/50 rounded-md">
              <span className="font-mono font-bold text-muted-foreground">{problem.start}</span>
              {moves.map((move, i) => (
                <div key={i} className="flex items-center">
                  <span className="text-muted-foreground mx-1">&rarr;</span>
                  <span className="font-mono font-bold bg-background px-2 py-1 rounded border border-border">
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
                <span className="text-muted-foreground mx-1">&rarr;</span>
                <span className="font-mono font-bold text-muted-foreground">{problem.end}</span>
              </div>
            </div>
          )}

          {gameState === 'playing' && (
            <>
              <PieceCoordinateInput
                activePiece={problem.piece}
                selectedFile={staged.selectedFile}
                selectedRank={staged.selectedRank}
                onFileToggle={handleFilePress}
                onRankToggle={handleRankPress}
                expandOnMobile
              >
                {/* Answer Action */}
                <div className="flex pt-4 mt-2 -mx-4 sm:mx-0">
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!canSubmit}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    <FaFlagCheckered className="mr-2" />
                    {t('submit')}
                  </Button>
                </div>
              </PieceCoordinateInput>
              <AlgebraicKeyboardHint disabled={!isInputActive} withSubmit />
            </>
          )}
        </div>

        {gameState === 'result' && result && (
          <RoutePlannerResultView
            problem={problem}
            result={result}
            moves={moves}
            onNextProblem={handleNextProblem}
            isTraining={true}
            isLastProblem={false}
          />
        )}
      </div>

      <TrainingFooter
        correct={results.filter((r) => r.success).length}
        incorrect={results.filter((r) => !r.success).length}
        onEndTraining={handleEndTraining}
        challengeHref={`/${locale}/practice/route-planner/challenge`}
        onSkip={gameState === 'playing' ? handleSkip : undefined}
      />
    </div>
  );
}
