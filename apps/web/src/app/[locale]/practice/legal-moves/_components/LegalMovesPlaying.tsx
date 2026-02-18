'use client';

import { useTranslations } from 'next-intl';

import { BoardOverlay } from '@/app/_components';
import { QuizTimer } from '@/components/QuizTimer';
import { LuPause, LuPlay } from 'react-icons/lu';

import { ScoreCounter } from '@/app/[locale]/practice/_components/ScoreCounter';

import { pieceDisplayMap } from '../_data/constants';
import type { MoveQuestion } from '../_lib/types';

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
}: Props) {
  const t = useTranslations('practice.legalMoves');
  const tPractice = useTranslations('practice');
  return (
    <div>
      <div className="relative bg-card rounded-2xl border border-border p-8 text-center overflow-hidden">
        {/* Header with Timer and Pause Button */}

        {/* Blur entire question area during countdown */}
        <BoardOverlay isVisible={countdown !== null} className="backdrop-blur-md">
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        {/* Pause Overlay with Play Button */}
        <BoardOverlay isVisible={isPaused} className="backdrop-blur-sm bg-black/40">
          <button
            onClick={onTogglePause}
            className="bg-white/90 hover:bg-white text-gray-900 rounded-full p-6 shadow-lg transition-all hover:scale-110 active:scale-95 pointer-events-auto"
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
          {/* Timer and Pause Button */}
          <div className="mb-8 flex justify-end">
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
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
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
              className="px-6 py-4 bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-2xl">○</span>
              <span>{t('legal')}</span>
            </button>
            <button
              onClick={() => onAnswer(false)}
              disabled={showResult || countdown !== null || isPaused}
              className="px-6 py-4 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-2xl">×</span>
              <span>{t('illegal')}</span>
            </button>
          </div>
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />
    </div>
  );
}
