'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';

import type { BoardOrientation } from '../_lib/types';
import { CoordinateQuizSettings } from './CoordinateQuizSettings';

type Props = {
  timeLimit: number;
  boardOrientation: BoardOrientation;
  onTimeLimitChange: (value: number) => void;
  onBoardOrientationChange: (value: BoardOrientation) => void;
  onStart: () => void;
};

export function CoordinateQuizSetup({
  timeLimit,
  boardOrientation,
  onTimeLimitChange,
  onBoardOrientationChange,
  onStart,
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
        />

        <Button
          onClick={onStart}
          variant="primary"
          size="lg"
          className="w-full rounded-lg font-semibold mt-6"
          icon={<FaPlay />}
        >
          {t('start')}
        </Button>
      </div>
    </div>
  );
}
