'use client';

import type { Square } from '@blindfold-chess/types';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { ChallengePauseOverlay } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengePauseOverlay';
import { ChallengeQuitControl } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeQuitControl';
import { ChallengeStatusHeader } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeStatusHeader';

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
  return (
    <div id="quiz-session">
      <div className="-mx-4 p-8 text-center overflow-hidden sm:mx-0">
        <div className="max-w-md mx-auto mb-8 relative">
          <ChallengeStatusHeader
            className="mb-4 relative flex items-center justify-between min-h-[50px]"
            remainingLives={remainingLives}
            maxLives={maxLives}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
            pauseDisabled={countdown !== null}
            timeRemaining={timeRemaining}
            timeLimit={timeLimit}
            timeElapsed={timeElapsed}
          />

          <div className="relative -mx-8 sm:mx-0">
            <CoordinateQuizGameBoard
              currentQuestion={currentQuestion}
              onSquareClick={onSquareClick}
              lastClickedSquare={lastClickedSquare}
              showFeedback={showFeedback}
              isCorrect={isCorrect}
              countdown={countdown}
              isObscured={isPaused}
              boardOverlay={
                /* Pause overlay — rendered inside the board-scoped container so
                   it covers only the board, not the orientation indicator. */
                <ChallengePauseOverlay
                  isPaused={isPaused}
                  onTogglePause={onTogglePause}
                  rounded="rounded-none sm:rounded-lg"
                />
              }
            />
          </div>
        </div>
      </div>

      <ScoreCounter correct={correctAnswers} incorrect={wrongAnswers} className="mt-4" />

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
