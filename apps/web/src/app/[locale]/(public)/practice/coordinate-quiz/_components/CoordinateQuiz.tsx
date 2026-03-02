'use client';

import { usePersistentSettings } from '@/app/[locale]/(public)/practice/_hooks/use-persistent-settings';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { BoardOrientation, FeedbackSpeed, PracticeMode } from '../_lib/types';
import { CoordinateQuizSetup } from './CoordinateQuizSetup';

type Props = {
  locale: Locale;
};

type CoordinateQuizLocalSettings = {
  timeLimit: number;
  boardOrientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
  mode: PracticeMode;
};

const STORAGE_KEY = 'coordinateQuiz_settings';
const DEFAULTS: CoordinateQuizLocalSettings = {
  timeLimit: 60,
  boardOrientation: 'white',
  feedbackSpeed: 'normal',
  mode: 'timed',
};

export default function CoordinateQuiz({ locale }: Props) {
  const { settings, updateSettings } = usePersistentSettings(STORAGE_KEY, DEFAULTS);

  return (
    <CoordinateQuizSetup
      locale={locale}
      timeLimit={settings.timeLimit}
      boardOrientation={settings.boardOrientation}
      feedbackSpeed={settings.feedbackSpeed}
      mode={settings.mode}
      onTimeLimitChange={(timeLimit) => updateSettings({ timeLimit })}
      onBoardOrientationChange={(boardOrientation) => updateSettings({ boardOrientation })}
      onFeedbackSpeedChange={(feedbackSpeed) => updateSettings({ feedbackSpeed })}
      onModeChange={(mode) => updateSettings({ mode })}
    />
  );
}
