'use client';

import type { Locale } from '@/app/[locale]/_lib/types';

import { useCoordinateQuizSettings } from '../_hooks/use-coordinate-quiz-settings';
import { CoordinateQuizSetup } from './CoordinateQuizSetup';

type Props = {
  locale: Locale;
};

export default function CoordinateQuiz({ locale }: Props) {
  const { settings, updateSettings } = useCoordinateQuizSettings();

  return (
    <CoordinateQuizSetup
      locale={locale}
      boardOrientation={settings.boardOrientation}
      onBoardOrientationChange={(boardOrientation) => updateSettings({ boardOrientation })}
    />
  );
}
