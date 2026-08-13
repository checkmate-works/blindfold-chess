'use client';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { ChallengeQuitControl } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeQuitControl';
import { ChallengeSessionVeil } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeSessionVeil';
import { ChallengeStatusHeader } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeStatusHeader';

import { LegalMovesQuestionPanel } from '../../_components/LegalMovesQuestionPanel';
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
  const inputDisabled = showResult || countdown !== null || isPaused;

  return (
    <div>
      <ChallengeSessionVeil
        countdown={countdown}
        isPaused={isPaused}
        onTogglePause={onTogglePause}
        className="p-8 text-center"
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

        <LegalMovesQuestionPanel
          currentQuestion={currentQuestion}
          lastAnswer={lastAnswer}
          onAnswer={onAnswer}
          getQuestion={getQuestion}
          disabled={inputDisabled}
        />

        <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />
      </ChallengeSessionVeil>

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
