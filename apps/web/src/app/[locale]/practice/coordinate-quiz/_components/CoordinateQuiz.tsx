'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { BoardOrientation, FeedbackSpeed } from '../_lib/types';
import { CoordinateQuizSetup } from './CoordinateQuizSetup';

type Props = {
  locale: Locale;
};

const STORAGE_KEY = 'coordinateQuiz_settings';

export default function CoordinateQuiz({ locale }: Props) {
  const [timeLimit, setTimeLimit] = useState(60);
  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>('white');
  const [feedbackSpeed, setFeedbackSpeed] = useState<FeedbackSpeed>('normal');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.timeLimit) setTimeLimit(settings.timeLimit);
        if (settings.boardOrientation) setBoardOrientation(settings.boardOrientation);
        if (settings.feedbackSpeed) setFeedbackSpeed(settings.feedbackSpeed);
      } catch {
        // Ignore invalid JSON in localStorage
      }
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage when they change (only after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ timeLimit, boardOrientation, feedbackSpeed })
      );
    }
  }, [timeLimit, boardOrientation, feedbackSpeed, isLoaded]);

  return (
    <CoordinateQuizSetup
      locale={locale}
      timeLimit={timeLimit}
      boardOrientation={boardOrientation}
      feedbackSpeed={feedbackSpeed}
      onTimeLimitChange={setTimeLimit}
      onBoardOrientationChange={setBoardOrientation}
      onFeedbackSpeedChange={setFeedbackSpeed}
    />
  );
}
