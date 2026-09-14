'use client';

import type { Square } from '@blindfold-chess/types';

import { TrainingFooter } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingFooter';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CoordinateQuizGameBoard } from '../../_components/CoordinateQuizGameBoard';
import type { BoardOrientation, CoordinateQuestion, FeedbackSpeed } from '../../_lib/types';

type Props = {
  locale: Locale;
  /** The settings this session runs on, carried into the challenge CTA. */
  boardOrientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
  currentQuestion: CoordinateQuestion | null;
  correctAnswers: number;
  wrongAnswers: number;
  lastClickedSquare: Square | null;
  showFeedback: boolean;
  isCorrect: boolean;
  onSquareClick: (square: Square) => void;
  onEndTraining: () => void;
};

export function CoordinateQuizTrainingPlaying({
  locale,
  boardOrientation,
  feedbackSpeed,
  currentQuestion,
  correctAnswers,
  wrongAnswers,
  lastClickedSquare,
  showFeedback,
  isCorrect,
  onSquareClick,
  onEndTraining,
}: Props) {
  return (
    <div>
      <div className="-mx-4 p-8 text-center overflow-hidden sm:mx-0">
        <div className="max-w-md mx-auto mb-8 relative">
          <div className="-mx-8 sm:mx-0">
            <CoordinateQuizGameBoard
              currentQuestion={currentQuestion}
              onSquareClick={onSquareClick}
              lastClickedSquare={lastClickedSquare}
              showFeedback={showFeedback}
              isCorrect={isCorrect}
              countdown={null}
            />
          </div>
        </div>
      </div>

      <TrainingFooter
        correct={correctAnswers}
        incorrect={wrongAnswers}
        onEndTraining={onEndTraining}
        // Carries the settings across: the CTA drops the player straight into
        // a session, so a bare URL would silently start a white-board run at
        // normal speed.
        challengeHref={`/${locale}/practice/coordinate-quiz/challenge/session?orientation=${boardOrientation}&feedbackSpeed=${feedbackSpeed}`}
        scoreClassName="mt-4"
      />
    </div>
  );
}
