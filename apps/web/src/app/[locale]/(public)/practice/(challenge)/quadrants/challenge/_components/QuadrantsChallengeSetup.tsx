'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { BoardOrientation } from '@blindfold-chess/features/quadrants';
import { FaPlay } from 'react-icons/fa';

import { MISTAKE_LIMIT } from '@/lib/challenge-constants';

import { BoardOrientationSelector } from '@/app/[locale]/(public)/practice/(challenge)/_components/BoardOrientationSelector';
import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';
import { usePersistentSettings } from '@/app/[locale]/(public)/practice/_hooks/use-persistent-settings';
import { SectionTitle } from '@/app/[locale]/_components';
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

  const { settings, updateSettings } = usePersistentSettings(STORAGE_KEY, DEFAULTS);

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set('orientation', settings.orientation);
    router.push(`/${locale}/practice/quadrants/challenge/session?${params.toString()}`);
  };

  return (
    <PracticePanel className="p-6">
      <SectionTitle className="mb-4">{t('challengeSetup.title')}</SectionTitle>

      <ul className="mb-6 space-y-2 text-sm text-muted-foreground list-disc list-inside">
        <li>{t('challengeSetup.timeLimit', { seconds: 60 })}</li>
        <li>{t('challengeSetup.mistakeLimit', { count: MISTAKE_LIMIT })}</li>
        <li className="text-destructive">{tQa('challengeSetupNoLeaderboard')}</li>
      </ul>

      <div className="mb-6">
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
      </div>

      <Button
        onClick={handleStart}
        variant="primary"
        size="lg"
        icon={<FaPlay />}
        className="w-full"
      >
        {t('startChallenge')}
      </Button>
    </PracticePanel>
  );
}
