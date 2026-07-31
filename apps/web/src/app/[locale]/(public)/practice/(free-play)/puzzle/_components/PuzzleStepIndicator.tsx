'use client';

import { useTranslations } from 'next-intl';

import { StepIndicator } from '@/app/[locale]/(public)/practice/(free-play)/_components/StepIndicator';

const PUZZLE_STEPS = ['position', 'solution', 'preview'] as const;

type PuzzleStep = (typeof PUZZLE_STEPS)[number];

/**
 * The create and edit flows currently walk the same three steps. They are
 * still keyed separately so one can gain or drop a step without the other
 * having to care.
 */
const FLOW_STEPS = {
  create: PUZZLE_STEPS,
  edit: PUZZLE_STEPS,
} as const;

type Props = { flow: 'create'; current: PuzzleStep } | { flow: 'edit'; current: PuzzleStep };

/**
 * The puzzle authoring steps, bound to this feature's translation namespace.
 * The three-step sibling of position-memory's two-step
 * `PositionMemoryStepIndicator`; both render through the shared
 * `StepIndicator`.
 */
export function PuzzleStepIndicator({ flow, current }: Props) {
  const t = useTranslations('practice.puzzle.create');

  const labels: Record<PuzzleStep, string> = {
    position: t('stepPosition'),
    solution: t('stepSolution'),
    preview: t('stepPreview'),
  };

  return (
    <StepIndicator
      ariaLabel={t('stepIndicatorLabel')}
      current={current}
      steps={FLOW_STEPS[flow].map((key) => ({ key, label: labels[key] }))}
    />
  );
}
