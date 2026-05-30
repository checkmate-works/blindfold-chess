'use client';

import { BoardOverlay } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Square } from '@blindfold-chess/types';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { LuPause, LuPlay } from 'react-icons/lu';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { QuizTimer } from '@/app/[locale]/(public)/practice/_components/QuizTimer';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';

import { CoordinateQuizGameBoard } from '../../_components/CoordinateQuizGameBoard';
import type { CoordinateQuestion } from '../../_lib/types';

type Props = {
  currentQuestion: CoordinateQuestion | null;
  timeRemaining: number;
  timeLimit: number;
  timeElapsed: number;
  correctAnswers: number;
  wrongAnswers: number;
  lastClickedSquare: Square | null;
  showFeedback: boolean;
  isCorrect: boolean;
  onSquareClick: (square: Square) => void;
  countdown: number | null;
  isPaused?: boolean;
  onTogglePause?: () => void;
  remainingLives: number;
  maxLives: number;
  onQuitRequest: () => void;
  showQuitModal: boolean;
  onQuitConfirm: () => void;
  onQuitCancel: () => void;
};

export function CoordinateQuizChallengePlaying({
  currentQuestion,
  timeRemaining,
  timeLimit,
  timeElapsed,
  correctAnswers,
  wrongAnswers,
  lastClickedSquare,
  showFeedback,
  isCorrect,
  onSquareClick,
  countdown,
  isPaused = false,
  onTogglePause,
  remainingLives,
  maxLives,
  onQuitRequest,
  showQuitModal,
  onQuitConfirm,
  onQuitCancel,
}: Props) {
  const tPractice = useTranslations('practice');
  const quitConfirmLabels = useQuitConfirmLabels();
  return (
    <div id="quiz-session">
      <div className="-mx-4 p-8 text-center overflow-hidden sm:mx-0">
        <div className="max-w-md mx-auto mb-8 relative">
          <div className="mb-4 relative flex items-center justify-between min-h-[50px]">
            {/* Lives - left side */}
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
            {/* Timer and Pause - right side */}
            <div className="flex items-center gap-2">
              {onTogglePause && (
                <button
                  onClick={onTogglePause}
                  className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                  disabled={countdown !== null}
                  aria-label={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? (
                    <LuPlay size={18} className="fill-current" />
                  ) : (
                    <LuPause size={18} className="fill-current" />
                  )}
                </button>
              )}
              <QuizTimer
                timeRemaining={timeRemaining}
                progress={timeLimit > 0 ? timeElapsed / timeLimit : 0}
                size={40}
                fontSize="text-xs"
                strokeWidth={4}
              />
            </div>
          </div>

          <div className="relative -mx-8 sm:mx-0">
            {/* Pause Overlay with Play Button */}
            <BoardOverlay
              isVisible={isPaused}
              className="backdrop-blur-sm bg-black/40 z-50 rounded-lg"
            >
              <button
                onClick={onTogglePause}
                className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 transition-all hover:scale-110 active:scale-95 pointer-events-auto"
                aria-label={tPractice('resume')}
              >
                <LuPlay size={48} className="fill-current ml-1" />
              </button>
            </BoardOverlay>

            <CoordinateQuizGameBoard
              currentQuestion={currentQuestion}
              onSquareClick={onSquareClick}
              lastClickedSquare={lastClickedSquare}
              showFeedback={showFeedback}
              isCorrect={isCorrect}
              countdown={countdown}
              isObscured={isPaused}
            />
          </div>
        </div>
      </div>

      <ScoreCounter correct={correctAnswers} incorrect={wrongAnswers} className="mt-4" />

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
