'use client';

import { useTranslations } from 'next-intl';

const STEPS = ['position', 'preview'] as const;

type Step = (typeof STEPS)[number];

type Props = {
  current: Step;
};

/**
 * "1 Position › 2 Preview" progress line shown under the page heading of the
 * position-memory authoring steps. Purely informational — the steps are not
 * links, since moving between them must go through the form's own
 * Continue/Back actions (which persist the draft); a bare navigation would
 * bypass that. The two-step sibling of the puzzle's three-step
 * `PuzzleStepIndicator` (position-memory has no solution-moves step).
 */
export function PositionMemoryStepIndicator({ current }: Props) {
  const t = useTranslations('practice.positionMemory.create');

  const currentIndex = STEPS.indexOf(current);
  const labels: Record<Step, string> = {
    position: t('stepPosition'),
    preview: t('stepPreview'),
  };

  return (
    <ol
      aria-label={t('stepIndicatorLabel')}
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
    >
      {STEPS.map((key, i) => {
        const isCurrent = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <li
            key={key}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex items-center gap-x-2"
          >
            {i > 0 && (
              <span aria-hidden className="text-muted-foreground/50">
                ›
              </span>
            )}
            <span
              aria-hidden
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                isCurrent
                  ? 'bg-primary text-primary-foreground'
                  : isDone
                    ? 'bg-muted text-foreground'
                    : 'border border-border text-muted-foreground'
              }`}
            >
              {i + 1}
            </span>
            <span className={isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}>
              {labels[key]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
