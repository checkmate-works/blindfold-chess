'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ChallengeSetupShell } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeSetupShell';
import { StandardChallengeRules } from '@/app/[locale]/(public)/practice/(challenge)/_components/StandardChallengeRules';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CoordinateQuizSettings } from '../../_components/CoordinateQuizSettings';
import { useCoordinateQuizSettings } from '../../_hooks/use-coordinate-quiz-settings';

type Props = {
  locale: Locale;
};

export function CoordinateQuizChallengeSetup({ locale }: Props) {
  const t = useTranslations('practice');
  const router = useRouter();

  const { settings, updateSettings } = useCoordinateQuizSettings();
  const { boardOrientation, feedbackSpeed } = settings;

  const handleStart = () => {
    const params = new URLSearchParams({
      orientation: boardOrientation,
      feedbackSpeed,
    });
    router.push(`/${locale}/practice/coordinate-quiz/challenge/session?${params.toString()}`);
  };

  return (
    <ChallengeSetupShell onStart={handleStart} rules={<StandardChallengeRules t={t} />}>
      <CoordinateQuizSettings
        boardOrientation={boardOrientation}
        feedbackSpeed={feedbackSpeed}
        onBoardOrientationChange={(next) => updateSettings({ boardOrientation: next })}
        onFeedbackSpeedChange={(next) => updateSettings({ feedbackSpeed: next })}
      />
    </ChallengeSetupShell>
  );
}
