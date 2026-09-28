'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { BoardOrientationSelector } from '@/app/[locale]/(public)/practice/(challenge)/_components/BoardOrientationSelector';
import { ChallengeSetupShell } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeSetupShell';
import { trainingHrefFor } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingModeButton';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useQuadrantsSettings } from '../../_hooks/use-quadrants-settings';

type Props = {
  locale: Locale;
};

export function QuadrantsChallengeSetup({ locale }: Props) {
  const t = useTranslations('practice');
  const tQuiz = useTranslations('practice.coordinateQuiz');
  const tQa = useTranslations('practice.quadrantAnchors');
  const router = useRouter();

  const { settings, updateSettings } = useQuadrantsSettings();

  const settingsQuery = new URLSearchParams({ orientation: settings.orientation }).toString();

  const handleStart = () => {
    router.push(`/${locale}/practice/quadrants/challenge/session?${settingsQuery}`);
  };

  return (
    <ChallengeSetupShell
      onStart={handleStart}
      // Training reads its orientation from the URL and has no selector of
      // its own, so the one picked here has to travel with the link.
      trainingHref={trainingHrefFor(locale, 'quadrants', settingsQuery)}
      rules={
        <>
          <li>{t('challengeSetup.timeLimit', { seconds: CHALLENGE_TIME_LIMIT })}</li>
          <li>{t('challengeSetup.mistakeLimit', { count: MISTAKE_LIMIT })}</li>
          <li className="text-destructive">{tQa('challengeSetupNoLeaderboard')}</li>
        </>
      }
    >
      <BoardOrientationSelector
        value={settings.orientation}
        onChange={(orientation) => updateSettings({ orientation })}
        labels={{
          title: tQuiz('boardOrientation'),
          white: tQuiz('white'),
          black: tQuiz('black'),
          random: tQuiz('random'),
        }}
      />
    </ChallengeSetupShell>
  );
}
