'use client';

import { useCallback, useMemo, useRef } from 'react';

import { useRouter } from 'next/navigation';

import { useTimedSession } from '@blindfold-chess/features/practice-session';
import type {
  BoardOrientation,
  QuadrantId,
  QuadrantQuestion,
} from '@blindfold-chess/features/quadrants';
import {
  checkQuadrantAnswer,
  generateQuadrantQuestionBatch,
} from '@blindfold-chess/features/quadrants';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { useQuitConfirm } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-quit-confirm';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { QuadrantsPlaySkeleton } from '../../_components/QuadrantsPlaySkeleton';
import { QuadrantsPlaying } from './QuadrantsPlaying';

type Props = {
  locale: Locale;
  orientation: BoardOrientation;
};

const BATCH_SIZE = 100;

export default function QuadrantsChallenge({ locale, orientation }: Props) {
  const router = useRouter();

  const questionsRef = useRef<QuadrantQuestion[]>([]);
  const indexRef = useRef(0);

  const generateQuestion = useCallback((): QuadrantQuestion => {
    if (questionsRef.current.length === 0) {
      questionsRef.current = generateQuadrantQuestionBatch(BATCH_SIZE, orientation);
    }
    if (indexRef.current >= questionsRef.current.length) {
      questionsRef.current = [
        ...questionsRef.current,
        ...generateQuadrantQuestionBatch(BATCH_SIZE, orientation),
      ];
    }
    const question = questionsRef.current[indexRef.current];
    indexRef.current += 1;
    return question;
  }, [orientation]);

  const {
    currentQuestion,
    timeRemaining,
    totalTime,
    correctCount,
    incorrectCount,
    showFeedback,
    lastAnswerCorrect,
    isFinished,
    countdown,
    isPaused,
    handleAnswer,
    togglePause,
  } = useTimedSession<QuadrantQuestion>({
    timeLimit: CHALLENGE_TIME_LIMIT,
    generateQuestion,
    mistakeAllowance: MISTAKE_LIMIT,
    feedbackDuration: (correct: boolean) => (correct ? 500 : 1500),
  });

  useScrollToElement('quadrants-challenge');

  const { showQuitModal, handleQuitRequest, handleQuitConfirm, handleQuitCancel } = useQuitConfirm({
    locale,
    moduleSlug: 'quadrants',
    isPaused,
    togglePause,
  });

  const handleQuadrantAnswer = useCallback(
    (selectedQuadrant: QuadrantId) => {
      if (!currentQuestion) return;
      const isCorrect = checkQuadrantAnswer(currentQuestion.square, selectedQuadrant);
      handleAnswer(isCorrect);
    },
    [currentQuestion, handleAnswer]
  );

  // Redirect on finish
  const total = correctCount + incorrectCount;
  const resultUrl = useMemo(() => {
    const params = new URLSearchParams({
      score: correctCount.toString(),
      total: total.toString(),
      time: totalTime.toString(),
    });
    return `/${locale}/practice/quadrants/result?${params.toString()}`;
  }, [correctCount, total, totalTime, locale]);

  // Simple redirect without saving (no leaderboard)
  const redirectedRef = useRef(false);
  if (isFinished && !redirectedRef.current) {
    redirectedRef.current = true;
    // Use setTimeout to avoid state update during render
    setTimeout(() => {
      router.push(resultUrl);
    }, 0);
  }

  if (isFinished) {
    return <PracticeResultSkeleton grantsExp />;
  }

  if (!currentQuestion) {
    return <QuadrantsPlaySkeleton showHeader />;
  }

  return (
    <div id="quadrants-challenge" className="min-h-screen">
      <QuadrantsPlaying
        currentQuestion={currentQuestion}
        timeRemaining={timeRemaining}
        timeLimit={CHALLENGE_TIME_LIMIT}
        showFeedback={showFeedback}
        lastAnswerCorrect={lastAnswerCorrect}
        onAnswer={handleQuadrantAnswer}
        countdown={countdown}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        isPaused={isPaused}
        onTogglePause={togglePause}
        remainingLives={MISTAKE_LIMIT - incorrectCount}
        maxLives={MISTAKE_LIMIT}
        onQuitRequest={handleQuitRequest}
        showQuitModal={showQuitModal}
        onQuitConfirm={handleQuitConfirm}
        onQuitCancel={handleQuitCancel}
      />
    </div>
  );
}
