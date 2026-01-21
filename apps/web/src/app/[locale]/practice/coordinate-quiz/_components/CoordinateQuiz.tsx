'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { BoardOrientation } from '../_lib/types';
import { CoordinateQuizSetup } from './CoordinateQuizSetup';

type Props = {
  locale: Locale;
};

const STORAGE_KEY = 'coordinateQuiz_settings';

export default function CoordinateQuiz({ locale }: Props) {
  const [timeLimit, setTimeLimit] = useState(60);
  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>('white');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.timeLimit) setTimeLimit(settings.timeLimit);
        if (settings.boardOrientation) setBoardOrientation(settings.boardOrientation);
      } catch {
        // Ignore invalid JSON in localStorage
      }
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage when they change (only after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLimit, boardOrientation }));
    }
  }, [timeLimit, boardOrientation, isLoaded]);

  return (
    <CoordinateQuizSetup
      locale={locale}
      timeLimit={timeLimit}
      boardOrientation={boardOrientation}
      onTimeLimitChange={setTimeLimit}
      onBoardOrientationChange={setBoardOrientation}
    />
  );
}
