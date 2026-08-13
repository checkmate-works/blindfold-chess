'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { BoardOrientation } from '@blindfold-chess/features/quadrants';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';
import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

import { BoardOrientationSelector } from '@/app/[locale]/(public)/practice/(challenge)/_components/BoardOrientationSelector';
import { ChallengeSetupShell } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeSetupShell';
import type { Locale } from '@/app/[locale]/_lib/types';

type QuadrantChallengeSettings = {
  orientation: BoardOrientation;
};

const STORAGE_KEY = 'quadrantAnchors_challenge_settings';
const DEFAULTS: QuadrantChallengeSettings = {
  orientation: 'white',
};

type Props = {
  locale: Locale;
};

export function QuadrantsChallengeSetup({ locale }: Props) {
  const t = useTranslations('practice');
  const tQuiz = useTranslations('practice.coordinateQuiz');
  const tQa = useTranslations('practice.quadrantAnchors');
  const router = useRouter();

  const { settings, updateSettings } = useLocalStorageSettings(STORAGE_KEY, DEFAULTS);

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set('orientation', settings.orientation);
    router.push(`/${locale}/practice/quadrants/challenge/session?${params.toString()}`);
  };

  return (
    <ChallengeSetupShell
      onStart={handleStart}
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
