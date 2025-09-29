'use client';

import { useTranslations } from 'next-intl';
import { SectionTitle, PrimaryButton } from '@/app/[locale]/_components';
import { CoordinateQuizSettings } from './CoordinateQuizSettings';
import type { BoardOrientation } from '../_lib/types';
import type { Locale } from '../../../_lib/types';

type Props = {
  timeLimit: number;
  boardOrientation: BoardOrientation;
  onTimeLimitChange: (value: number) => void;
  onBoardOrientationChange: (value: BoardOrientation) => void;
  onStart: () => void;
  locale: Locale;
};

export function CoordinateQuizSetup({
  timeLimit,
  boardOrientation,
  onTimeLimitChange,
  onBoardOrientationChange,
  onStart,
  locale,
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        <SectionTitle className="text-xl mb-4">{t('settings')}</SectionTitle>

        <CoordinateQuizSettings
          timeLimit={timeLimit}
          boardOrientation={boardOrientation}
          onTimeLimitChange={onTimeLimitChange}
          onBoardOrientationChange={onBoardOrientationChange}
          locale={locale}
        />

        <PrimaryButton onClick={onStart} className="mt-6">
          {t('start')}
        </PrimaryButton>
      </div>
    </div>
  );
}
