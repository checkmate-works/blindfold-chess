'use client';

import { BoardOverlay } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { LuPause, LuPlay } from 'react-icons/lu';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { SquareColorAnswerButtons } from '@/app/[locale]/(public)/practice/(challenge)/square-colors/_components/SquareColorAnswerButtons';
import { SquareColorQuestionDisplay } from '@/app/[locale]/(public)/practice/(challenge)/square-colors/_components/SquareColorQuestionDisplay';
import { ArrowKeyAnswer } from '@/app/[locale]/(public)/practice/_components/ArrowKeyAnswer';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { QuizTimer } from '@/app/[locale]/(public)/practice/_components/QuizTimer';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';

type Props = {
  currentSquare: string;
  timeRemaining: number;
  timeLimit: number;
  showResult: boolean;
  lastAnswer: { correct: boolean; square: string } | null;
  onAnswer: (color: 'light' | 'dark') => void;
  boardTheme?: BoardTheme;
  countdown: number | null;
  correctCount: number;
  incorrectCount: number;
  isPaused: boolean;
  onTogglePause: () => void;
  remainingLives: number;
  maxLives: number;
  onQuitRequest: () => void;
  showQuitModal: boolean;
  onQuitConfirm: () => void;
  onQuitCancel: () => void;
};

export function SquareColorsPlaying({
  currentSquare,
  timeRemaining,
  timeLimit,
  showResult,
  lastAnswer,
  onAnswer,
  boardTheme = DEFAULT_BOARD_THEME,
  countdown,
  correctCount,
  incorrectCount,
  isPaused,
  onTogglePause,
  remainingLives,
  maxLives,
  onQuitRequest,
  showQuitModal,
  onQuitConfirm,
  onQuitCancel,
}: Props) {
  const t = useTranslations('practice.squareColors');
  const tPractice = useTranslations('practice');
  const quitConfirmLabels = useQuitConfirmLabels();
  const timeElapsed = timeLimit - timeRemaining;
  const inputDisabled = showResult || countdown !== null || isPaused;

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-xl border border-border p-8 text-center relative overflow-hidden shadow-sm">
        {/* Header: Lives and Timer */}
        <div className="mb-6">
          <div className="flex justify-between items-center mt-2">
            {/* Lives */}
            <div className="flex items-center gap-1">
              {Array.from({ length: maxLives }, (_, i) => (
                <span key={i} className="text-destructive">
                  {i < remainingLives ? (
                    <FaHeart className="w-5 h-5" />
                  ) : (
                    <FaRegHeart className="w-5 h-5 opacity-30" />
                  )}
                </span>
              ))}
            </div>
            {/* Timer */}
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePause}
                disabled={countdown !== null || showResult}
                className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                aria-label={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? (
                  <LuPlay size={18} className="fill-current" />
                ) : (
                  <LuPause size={18} className="fill-current" />
                )}
              </button>

              <QuizTimer
                timeRemaining={timeRemaining}
                progress={timeLimit > 0 ? timeElapsed / timeLimit : 0}
                size={40}
                fontSize="text-xs"
                strokeWidth={4}
              />
            </div>
          </div>
        </div>

        {/* Countdown Overlay */}
        <BoardOverlay
          isVisible={countdown !== null}
          className="backdrop-blur-md"
          data-testid="countdown-overlay"
        >
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        {/* Pause Overlay with Play Button */}
        <BoardOverlay isVisible={isPaused} className="backdrop-blur-sm bg-black/40">
          <button
            onClick={onTogglePause}
            className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 shadow-lg transition-all hover:scale-110 active:scale-95 pointer-events-auto"
            aria-label={tPractice('resume')}
          >
            <LuPlay size={48} className="fill-current ml-1" />
          </button>
        </BoardOverlay>

        {/* Content with Blur when Paused */}
        <div
          className={`transition-all duration-300 ${isPaused ? 'blur-md grayscale opacity-50 pointer-events-none' : ''}`}
        >
          <SquareColorQuestionDisplay currentSquare={currentSquare} lastAnswer={lastAnswer} />

          <ArrowKeyAnswer
            disabled={inputDisabled}
            bindings={{
              ArrowLeft: { label: t('white'), onTrigger: () => onAnswer('light') },
              ArrowRight: { label: t('black'), onTrigger: () => onAnswer('dark') },
            }}
          >
            <SquareColorAnswerButtons
              onAnswer={onAnswer}
              disabled={inputDisabled}
              labels={{ white: t('white'), black: t('black') }}
              boardTheme={boardTheme}
            />
          </ArrowKeyAnswer>
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />

      <div className="mt-6 text-center">
        <button
          onClick={onQuitRequest}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tPractice('quit')}
        </button>
      </div>

      <QuitConfirmModal
        isOpen={showQuitModal}
        onConfirm={onQuitConfirm}
        onCancel={onQuitCancel}
        labels={quitConfirmLabels}
      />
    </div>
  );
}
