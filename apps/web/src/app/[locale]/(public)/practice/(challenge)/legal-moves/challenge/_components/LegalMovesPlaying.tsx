'use client';

import { BoardOverlay } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { LuPause, LuPlay } from 'react-icons/lu';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { QuizTimer } from '@/app/[locale]/(public)/practice/_components/QuizTimer';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';

import { pieceDisplayMap } from '../../_data/constants';
import type { MoveQuestion } from '../../_lib/types';

type Props = {
  currentQuestion: MoveQuestion;
  timeRemaining: number;
  timeLimit: number;
  timeElapsed: number;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
    userAnswer: boolean;
    isLegal: boolean;
  } | null;
  onAnswer: (answer: boolean) => void;
  getQuestion: (from: string, to: string) => string;
  countdown: number | null;
  correctCount: number;
  incorrectCount: number;
  isPaused?: boolean;
  onTogglePause?: () => void;
  remainingLives: number;
  maxLives: number;
  onQuitRequest: () => void;
  showQuitModal: boolean;
  onQuitConfirm: () => void;
  onQuitCancel: () => void;
};

export function LegalMovesPlaying({
  currentQuestion,
  timeRemaining,
  timeLimit,
  timeElapsed,
  showResult,
  lastAnswer,
  onAnswer,
  getQuestion,
  countdown,
  correctCount,
  incorrectCount,
  isPaused = false,
  onTogglePause,
  remainingLives,
  maxLives,
  onQuitRequest,
  showQuitModal,
  onQuitConfirm,
  onQuitCancel,
}: Props) {
  const t = useTranslations('practice.legalMoves');
  const tPractice = useTranslations('practice');
  const quitConfirmLabels = useQuitConfirmLabels();
  return (
    <div>
      <div className="relative bg-card rounded-2xl border border-border p-8 text-center overflow-hidden">
        {/* Header with Timer and Pause Button */}

        {/* Blur entire question area during countdown */}
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

        <div
          className={`transition-all duration-300 ${
            isPaused || countdown !== null ? 'blur-md grayscale opacity-50 pointer-events-none' : ''
          }`}
        >
          {/* Timer, Lives and Pause Button */}
          <div className="mb-8 flex items-center justify-between">
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
                  disabled={countdown !== null || showResult}
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

          <div className="mb-8 min-h-[160px] flex flex-col items-center justify-center">
            <div
              className={`text-lg font-bold mb-6 transition-colors duration-200 ${
                lastAnswer
                  ? lastAnswer.correct
                    ? 'text-success'
                    : 'text-destructive'
                  : 'text-foreground'
              }`}
            >
              {getQuestion(currentQuestion.from, currentQuestion.to)
                .replace('{from}', currentQuestion.from)
                .replace('{to}', currentQuestion.to)}
            </div>
            <div className="text-7xl">{pieceDisplayMap[currentQuestion.piece]}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onAnswer(true)}
              disabled={showResult || countdown !== null || isPaused}
              className="px-6 py-4 bg-success/10 hover:bg-success/20 disabled:opacity-50 disabled:cursor-not-allowed text-success border border-success/30 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-2xl">○</span>
              <span>{t('legal')}</span>
            </button>
            <button
              onClick={() => onAnswer(false)}
              disabled={showResult || countdown !== null || isPaused}
              className="px-6 py-4 bg-destructive/10 hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed text-destructive border border-destructive/30 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-2xl">×</span>
              <span>{t('illegal')}</span>
            </button>
          </div>
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
