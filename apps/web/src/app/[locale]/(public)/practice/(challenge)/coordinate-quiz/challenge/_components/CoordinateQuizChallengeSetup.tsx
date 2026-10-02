'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ChallengeSetupShell } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeSetupShell';
import { useQuerySeededSettings } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-query-seeded-settings';
import { StandardChallengeRules } from '@/app/[locale]/(public)/practice/(challenge)/_components/StandardChallengeRules';
import { trainingHrefFor } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingModeButton';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CoordinateQuizSettings } from '../../_components/CoordinateQuizSettings';
import { useCoordinateQuizSettings } from '../../_hooks/use-coordinate-quiz-settings';
import type { BoardOrientation } from '../../_lib/types';

type Props = {
  locale: Locale;
  /** The orientation the entering link named (the leaderboard's challenge button). */
  initialBoardOrientation?: BoardOrientation | undefined;
};

export function CoordinateQuizChallengeSetup({ locale, initialBoardOrientation }: Props) {
  const t = useTranslations('practice');
  const router = useRouter();

  const { settings, updateSettings } = useQuerySeededSettings(
    useCoordinateQuizSettings(),
    initialBoardOrientation ? { boardOrientation: initialBoardOrientation } : undefined,
    ['orientation']
  );
  const { boardOrientation, feedbackSpeed } = settings;

  const settingsQuery = new URLSearchParams({
    orientation: boardOrientation,
    feedbackSpeed,
  }).toString();

  const handleStart = () => {
    router.push(`/${locale}/practice/coordinate-quiz/challenge/session?${settingsQuery}`);
  };

  return (
    <ChallengeSetupShell
      onStart={handleStart}
      trainingHref={trainingHrefFor(locale, 'coordinate-quiz', settingsQuery)}
      rules={<StandardChallengeRules t={t} />}
    >
      <CoordinateQuizSettings
        boardOrientation={boardOrientation}
        feedbackSpeed={feedbackSpeed}
        onBoardOrientationChange={(next) => updateSettings({ boardOrientation: next })}
        onFeedbackSpeedChange={(next) => updateSettings({ feedbackSpeed: next })}
      />
    </ChallengeSetupShell>
  );
}
