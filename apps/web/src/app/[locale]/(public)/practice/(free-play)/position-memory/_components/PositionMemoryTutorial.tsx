'use client';

import { useRouter } from 'next/navigation';

import { BoardSkeleton, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { encodeFensToBase64 } from '../_lib/utils';

type Props = {
  locale: Locale;
};

const TUTORIAL_TIME_LIMIT = 60;
const TUTORIAL_PROBLEM_COUNT = 1;
const LUCENA_FEN = '1K1k4/1P6/8/8/8/8/r7/4R3 w - - 0 1';

export function PositionMemoryTutorial({ locale }: Props) {
  const t = useTranslations('practice.positionMemory');
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set('timeLimit', TUTORIAL_TIME_LIMIT.toString());
    params.set('shuffle', '0');
    params.set('count', TUTORIAL_PROBLEM_COUNT.toString());
    params.set('mode', 'tutorial');
    params.set('problems', encodeFensToBase64([LUCENA_FEN]));
    params.set('skipMemorize', '1');
    router.push(`/${locale}/practice/position-memory/session?${params.toString()}`);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <p className="text-muted-foreground mb-6">{t('tutorial.description')}</p>

        <div className="aspect-square bg-secondary/30 rounded-lg overflow-hidden mb-6">
          {!isLoaded ? (
            <BoardSkeleton rounded={false} />
          ) : (
            <AnimatedChessBoard
              initialFen={LUCENA_FEN}
              showCoordinates={true}
              flipped={false}
              boardTheme={preferences.boardTheme}
            />
          )}
        </div>

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          className="w-full"
          icon={<FaPlay />}
        >
          {t('tutorial.start')}
        </Button>
      </div>
    </div>
  );
}
