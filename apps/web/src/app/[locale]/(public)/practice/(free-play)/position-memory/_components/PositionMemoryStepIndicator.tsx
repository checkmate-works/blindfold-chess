'use client';

import { useTranslations } from 'next-intl';

import { StepIndicator } from '@/app/[locale]/(public)/practice/(free-play)/_components/StepIndicator';

type Props = {
  current: 'position' | 'preview';
};

/**
 * The position-memory authoring steps, bound to this feature's translation
 * namespace. The two-step sibling of the puzzle's three-step
 * `PuzzleStepIndicator` (position-memory has no solution-moves step); both
 * render through the shared `StepIndicator`.
 */
export function PositionMemoryStepIndicator({ current }: Props) {
  const t = useTranslations('practice.positionMemory.create');

  return (
    <StepIndicator
      ariaLabel={t('stepIndicatorLabel')}
      current={current}
      steps={[
        { key: 'position', label: t('stepPosition') },
        { key: 'preview', label: t('stepPreview') },
      ]}
    />
  );
}
