'use client';

import { BoardOverlay } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { LuPlay } from 'react-icons/lu';

import { AnswerFeedback } from '@/app/[locale]/(public)/practice/_components/AnswerFeedback';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { ScoreCounter } from '@/app/[locale]/(public)/practice/_components/ScoreCounter';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';
import { SectionTitle } from '@/app/[locale]/_components';

import { ChessCoordinateKeypad } from '../../_components/ChessCoordinateKeypad';
import { DiagonalInputField } from '../../_components/DiagonalInputField';
import { useKeypadInput } from '../_hooks/use-keypad-input';
import { ChallengePlayingHeader } from './ChallengePlayingHeader';

type Props = {
  currentSquare: string;
  timeRemaining: number;
  timeLimit: number;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
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
  const quitConfirmLabels = useQuitConfirmLabels();
  const isDisabled = showResult || countdown !== null || isPaused;

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

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-xl border border-border p-8 text-center relative overflow-hidden shadow-sm">
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
            onClick={onTogglePause}
            className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 shadow-lg transition-all hover:scale-110 active:scale-95 pointer-events-auto"
            aria-label="Resume"
          >
            <LuPlay size={48} className="fill-current ml-1" />
          </button>
        </BoardOverlay>

        <div
          className={
            isPaused || countdown !== null
              ? 'blur-sm transition-all duration-300'
              : 'transition-all duration-300'
          }
        >
          <SectionTitle className="mb-4">{t('question', { square: currentSquare })}</SectionTitle>

          <ChallengePlayingHeader
            remainingLives={remainingLives}
            maxLives={maxLives}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
            countdown={countdown}
            timeRemaining={timeRemaining}
            timeLimit={timeLimit}
          />

          <div className="mb-6">
            <div className="text-6xl font-bold text-foreground mb-4">{currentSquare}</div>

            <AnswerFeedback
              isCorrect={lastAnswer?.correct ?? null}
              isVisible={showResult && !!lastAnswer}
              incorrectMessage={
                lastAnswer && !lastAnswer.correct
                  ? t('correctAnswer', {
                      diagonal: lastAnswer.correctDiagonal,
                      antiDiagonal: lastAnswer.correctAntiDiagonal,
                    })
                  : undefined
              }
              className="mb-2"
            />
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
            />
          </div>

          {/* Step indicator */}
          {!isDisabled && (
            <div className="text-sm text-muted-foreground mb-4">
              {expectingFile ? t('selectFile') : expectingRank ? t('selectRank') : ''}
            </div>
          )}

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
        </div>
      </div>

      {showStats && (
        <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />
      )}

      {onQuitRequest && (
        <div className="mt-6 text-center">
          <button
            onClick={onQuitRequest}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tPractice('quit')}
          </button>
        </div>
      )}

      {onQuitConfirm && onQuitCancel && (
        <QuitConfirmModal
          isOpen={showQuitModal ?? false}
          onConfirm={onQuitConfirm}
          onCancel={onQuitCancel}
          labels={quitConfirmLabels}
        />
      )}
    </div>
  );
}
