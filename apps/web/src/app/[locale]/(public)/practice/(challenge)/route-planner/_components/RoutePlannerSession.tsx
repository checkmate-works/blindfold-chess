'use client';

import { Button } from '@/app/_components';
import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowRight, FaFlagCheckered, FaUndo } from 'react-icons/fa';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { AlgebraicKeyboardHint } from '@/app/[locale]/(public)/practice/_components/KeyboardHint';
import { PieceCoordinateInput } from '@/app/[locale]/(public)/practice/_components/PieceCoordinateInput';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useAlgebraicKeyboardInput } from '@/app/[locale]/(public)/practice/_hooks/use-algebraic-keyboard-input';

import { TrainingChallengeCTA } from '../../_components/TrainingChallengeCTA';
import { useRoutePlannerGame } from '../_hooks/use-route-planner-game';
import { useStagedCoordinate } from '../_hooks/use-staged-coordinate';
import { PIECES } from '../_lib/utils';
import type { PieceType } from '../_lib/utils';
import { RoutePlannerResultView } from './RoutePlannerResultView';

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

  useAlgebraicKeyboardInput({
    onFile: handleFilePress,
    onRank: handleRankPress,
    onBackspace: handleBackspace,
    enabled: isInputActive,
  });

  if (!problem) return <PracticeResultSkeleton />;

  return (
    <div className="min-h-screen max-w-md mx-auto">
      <div id="route-planner-session" className="text-center relative overflow-hidden">
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
                    disabled={moves.length === 0 && problem.start === problem.end}
                    variant="primary"
                    className="w-full"
                  >
                    <FaFlagCheckered className="mr-2" />
                    {t('submit')}
                  </Button>
                </div>
              </PieceCoordinateInput>
              <AlgebraicKeyboardHint disabled={!isInputActive} />
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

      <ScoreCounter
        correct={results.filter((r) => r.success).length}
        incorrect={results.filter((r) => !r.success).length}
        className="mt-8"
      />

      {/* Skip / End Training section outside the card */}
      <div className="mt-6 text-center space-y-2">
        {gameState === 'playing' && (
          <div>
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {tPractice('skip')}
            </button>
          </div>
        )}
        <div>
          <button
            onClick={handleEndTraining}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tPractice('endTraining')}
          </button>
        </div>
      </div>

      <TrainingChallengeCTA challengeHref={`/${locale}/practice/route-planner/challenge`} />
    </div>
  );
}
