'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { ChallengeCountdownOverlay } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeCountdownOverlay';
import { ChallengePauseOverlay } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengePauseOverlay';
import { ChallengeQuitControl } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeQuitControl';
import { ChallengeStatusHeader } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeStatusHeader';
import { AlgebraicKeyboardHint } from '@/app/[locale]/(public)/practice/_components/KeyboardHint';
import { useAlgebraicKeyboardInput } from '@/app/[locale]/(public)/practice/_hooks/use-algebraic-keyboard-input';
import { SectionTitle } from '@/app/[locale]/_components';

import { ChessCoordinateKeypad } from '../../_components/ChessCoordinateKeypad';
import { DiagonalInputField } from '../../_components/DiagonalInputField';
import { useKeypadInput } from '../_hooks/use-keypad-input';

type Props = {
  currentSquare: string;
  timeRemaining: number;
  timeLimit: number;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
    isDiagonalCorrect: boolean;
    isAntiDiagonalCorrect: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null;
  onAnswer: (diagonal: string, antiDiagonal: string) => void;
  countdown: number | null;
  correctCount: number;
  incorrectCount: number;
  showStats?: boolean;
  isPaused?: boolean;
  onTogglePause?: () => void;
  remainingLives?: number;
  maxLives?: number;
  onQuitRequest?: () => void;
  showQuitModal?: boolean;
  onQuitConfirm?: () => void;
  onQuitCancel?: () => void;
};

export function DiagonalQuizPlaying({
  currentSquare,
  timeRemaining,
  timeLimit,
  showResult,
  lastAnswer,
  onAnswer,
  countdown,
  correctCount,
  incorrectCount,
  showStats = true,
  isPaused = false,
  onTogglePause,
  remainingLives,
  maxLives,
  onQuitRequest,
  showQuitModal,
  onQuitConfirm,
  onQuitCancel,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const tPractice = useTranslations('practice');
  const isDisabled = showResult || countdown !== null || isPaused;

  // Correct/incorrect is signaled by tinting the answer fields rather than a
  // text flash, so the layout never shifts when a result appears. Each
  // diagonal is graded independently, so a half-right answer shows one green
  // field and one red field instead of tinting both the same.
  const diagonalResult =
    showResult && lastAnswer ? (lastAnswer.isDiagonalCorrect ? 'correct' : 'incorrect') : null;
  const antiDiagonalResult =
    showResult && lastAnswer ? (lastAnswer.isAntiDiagonalCorrect ? 'correct' : 'incorrect') : null;

  const {
    singleDiagonal,
    singleAntiDiagonal,
    diagonalStartText,
    diagonalEndText,
    antiDiagonalStartText,
    antiDiagonalEndText,
    activeField,
    isDiagonalComplete,
    isAntiDiagonalComplete,
    expectingFile,
    expectingRank,
    isInputtingStart,
    isInputtingEnd,
    handleFilePress,
    handleRankPress,
    handleBackspace,
    handleClear,
    handleFieldClick,
  } = useKeypadInput({
    currentSquare,
    showResult,
    isDisabled,
    onAnswer,
  });

  useAlgebraicKeyboardInput({
    onFile: handleFilePress,
    onRank: handleRankPress,
    onBackspace: handleBackspace,
    enabled: !isDisabled,
  });

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center relative overflow-hidden">
        <ChallengeCountdownOverlay countdown={countdown} />
        <ChallengePauseOverlay isPaused={isPaused} onTogglePause={onTogglePause} />

        <div
          className={
            isPaused || countdown !== null
              ? 'blur-sm transition-all duration-300'
              : 'transition-all duration-300'
          }
        >
          <SectionTitle className="mb-4">{t('question', { square: currentSquare })}</SectionTitle>

          <ChallengeStatusHeader
            className="flex justify-between items-center mb-4 min-h-[40px] relative"
            remainingLives={remainingLives}
            maxLives={maxLives}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
            pauseDisabled={countdown !== null}
            timeRemaining={timeRemaining}
            timeLimit={timeLimit}
          />

          <div className="mb-6">
            <div className="text-6xl font-bold text-foreground mb-4 select-none">
              {currentSquare}
            </div>

            {showResult && lastAnswer && (
              <p className="sr-only" role="status">
                {lastAnswer.correct
                  ? tPractice('correct')
                  : t('correctAnswer', {
                      diagonal: lastAnswer.correctDiagonal,
                      antiDiagonal: lastAnswer.correctAntiDiagonal,
                    })}
              </p>
            )}
          </div>

          {/* Diagonal Input Display Fields */}
          <div className="space-y-3 mb-6">
            <DiagonalInputField
              label={t('diagonalLabel')}
              isSingleSquare={singleDiagonal}
              activeField={activeField}
              fieldType="diagonal"
              startText={diagonalStartText}
              endText={diagonalEndText}
              isComplete={isDiagonalComplete}
              isDisabled={isDisabled}
              isInputtingStart={isInputtingStart}
              isInputtingEnd={isInputtingEnd}
              onFieldClick={handleFieldClick}
              result={diagonalResult}
            />

            <DiagonalInputField
              label={t('antiDiagonalLabel')}
              isSingleSquare={singleAntiDiagonal}
              activeField={activeField}
              fieldType="antiDiagonal"
              startText={antiDiagonalStartText}
              endText={antiDiagonalEndText}
              isComplete={isAntiDiagonalComplete}
              isDisabled={isDisabled}
              isInputtingStart={isInputtingStart}
              isInputtingEnd={isInputtingEnd}
              onFieldClick={handleFieldClick}
              result={antiDiagonalResult}
            />
          </div>

          {/* Step indicator — height reserved so the keypad stays put when the
              hint clears on result (no layout shift). */}
          <div className="text-sm text-muted-foreground mb-4 min-h-5">
            {!isDisabled &&
              (expectingFile ? t('selectFile') : expectingRank ? t('selectRank') : '')}
          </div>

          {/* Button Input Area */}
          <ChessCoordinateKeypad
            expectingFile={expectingFile}
            expectingRank={expectingRank}
            isDisabled={isDisabled}
            onFilePress={handleFilePress}
            onRankPress={handleRankPress}
            onBackspace={handleBackspace}
            onClear={handleClear}
          />

          <AlgebraicKeyboardHint disabled={isDisabled} />
        </div>
      </div>

      {showStats && (
        <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />
      )}

      {/* Training mode reuses this component without the quit affordance —
          there is no run to abandon, so none of the handlers are passed. */}
      {onQuitRequest && onQuitConfirm && onQuitCancel && (
        <ChallengeQuitControl
          className="mt-6 text-center"
          onQuitRequest={onQuitRequest}
          showQuitModal={showQuitModal ?? false}
          onQuitConfirm={onQuitConfirm}
          onQuitCancel={onQuitCancel}
        />
      )}
    </div>
  );
}
