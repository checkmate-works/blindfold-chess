'use client';

import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { BoardOrientation, FeedbackSpeed } from '../_lib/types';
import { CoordinateQuizSetup } from './CoordinateQuizSetup';

type Props = {
  locale: Locale;
};

type CoordinateQuizLocalSettings = {
  boardOrientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
};

const STORAGE_KEY = 'coordinateQuiz_settings';
const DEFAULTS: CoordinateQuizLocalSettings = {
  boardOrientation: 'white',
  feedbackSpeed: 'normal',
};

export default function CoordinateQuiz({ locale }: Props) {
  const { settings, updateSettings } = useLocalStorageSettings(STORAGE_KEY, DEFAULTS);

  return (
    <CoordinateQuizSetup
      locale={locale}
      boardOrientation={settings.boardOrientation}
      feedbackSpeed={settings.feedbackSpeed}
      onBoardOrientationChange={(boardOrientation) => updateSettings({ boardOrientation })}
      onFeedbackSpeedChange={(feedbackSpeed) => updateSettings({ feedbackSpeed })}
    />
  );
}
