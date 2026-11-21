'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BoardOrientationSelector } from '@/app/[locale]/(public)/practice/(challenge)/_components/BoardOrientationSelector';

import type { BoardOrientation } from '../_lib/types';

type Props = {
  boardOrientation: BoardOrientation;
  onBoardOrientationChange: (orientation: BoardOrientation) => void;
};

export function CoordinateQuizSettings({ boardOrientation, onBoardOrientationChange }: Props) {
  const t = useTranslations('practice.coordinateQuiz');

  return (
    <BoardOrientationSelector
      value={boardOrientation}
      onChange={onBoardOrientationChange}
      labels={{
        title: t('boardOrientation'),
        white: t('white'),
        black: t('black'),
        random: t('random'),
      }}
    />
  );
}
