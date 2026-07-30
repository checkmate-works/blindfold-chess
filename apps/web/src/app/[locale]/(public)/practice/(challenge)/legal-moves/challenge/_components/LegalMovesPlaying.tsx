'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { ChallengeCountdownOverlay } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeCountdownOverlay';
import { ChallengePauseOverlay } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengePauseOverlay';
import { ChallengeQuitControl } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeQuitControl';
import { ChallengeStatusHeader } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeStatusHeader';
import { ArrowKeyAnswer } from '@/app/[locale]/(public)/practice/_components/ArrowKeyAnswer';

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
  const inputDisabled = showResult || countdown !== null || isPaused;

  return (
    <div>
      <div className="relative p-8 text-center overflow-hidden">
        <ChallengeCountdownOverlay countdown={countdown} />
        <ChallengePauseOverlay isPaused={isPaused} onTogglePause={onTogglePause} />

        <div
          className={`transition-all duration-300 ${
            isPaused || countdown !== null ? 'blur-md grayscale opacity-50 pointer-events-none' : ''
          }`}
        >
          <ChallengeStatusHeader
            className="mb-8 flex items-center justify-between"
            remainingLives={remainingLives}
            maxLives={maxLives}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
            pauseDisabled={countdown !== null || showResult}
            timeRemaining={timeRemaining}
            timeLimit={timeLimit}
            timeElapsed={timeElapsed}
          />

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
            <div className="text-7xl select-none">{pieceDisplayMap[currentQuestion.piece]}</div>
          </div>

          <ArrowKeyAnswer
            disabled={inputDisabled}
            bindings={{
              ArrowLeft: { label: t('legal'), onTrigger: () => onAnswer(true) },
              ArrowRight: { label: t('illegal'), onTrigger: () => onAnswer(false) },
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => onAnswer(true)}
                disabled={inputDisabled}
                className="px-6 py-4 bg-success/10 hover:bg-success/20 disabled:opacity-50 disabled:cursor-not-allowed text-success border border-success/30 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2 touch-manipulation select-none"
              >
                <span className="text-2xl">○</span>
                <span>{t('legal')}</span>
              </button>
              <button
                onClick={() => onAnswer(false)}
                disabled={inputDisabled}
                className="px-6 py-4 bg-destructive/10 hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed text-destructive border border-destructive/30 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2 touch-manipulation select-none"
              >
                <span className="text-2xl">×</span>
                <span>{t('illegal')}</span>
              </button>
            </div>
          </ArrowKeyAnswer>
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />

      <ChallengeQuitControl
        className="mt-6 text-center"
        onQuitRequest={onQuitRequest}
        showQuitModal={showQuitModal}
        onQuitConfirm={onQuitConfirm}
        onQuitCancel={onQuitCancel}
      />
    </div>
  );
}
