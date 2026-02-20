'use client';

import type { Locale } from '@/app/[locale]/_lib/types';
import { usePersistentSettings } from '@/app/[locale]/practice/_hooks/usePersistentSettings';

import type { BoardOrientation, FeedbackSpeed } from '../_lib/types';
import { CoordinateQuizSetup } from './CoordinateQuizSetup';

type Props = {
  locale: Locale;
};

type CoordinateQuizLocalSettings = {
  timeLimit: number;
  boardOrientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
};

const STORAGE_KEY = 'coordinateQuiz_settings';
const DEFAULTS: CoordinateQuizLocalSettings = {
  timeLimit: 60,
  boardOrientation: 'white',
  feedbackSpeed: 'normal',
};

export default function CoordinateQuiz({ locale }: Props) {
  const { settings, updateSettings } = usePersistentSettings(STORAGE_KEY, DEFAULTS);

  return (
    <CoordinateQuizSetup
      locale={locale}
      timeLimit={settings.timeLimit}
      boardOrientation={settings.boardOrientation}
      feedbackSpeed={settings.feedbackSpeed}
      onTimeLimitChange={(timeLimit) => updateSettings({ timeLimit })}
      onBoardOrientationChange={(boardOrientation) => updateSettings({ boardOrientation })}
      onFeedbackSpeedChange={(feedbackSpeed) => updateSettings({ feedbackSpeed })}
    />
  );
}
