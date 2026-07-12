'use client';

import { useTranslations } from 'next-intl';

const FLOW_STEPS = {
  create: ['position', 'solution', 'preview'],
  edit: ['position', 'solution'],
} as const;

type Props =
  | { flow: 'create'; current: (typeof FLOW_STEPS)['create'][number] }
  | { flow: 'edit'; current: (typeof FLOW_STEPS)['edit'][number] };

/**
 * "1 Position › 2 Solution › 3 Preview" progress line shown under the page
 * heading of every puzzle authoring step. Purely informational — the steps
 * are not links, since moving between them must go through each form's own
 * Continue/Back actions (which persist the draft and run the position-changed
 * guard); a bare navigation would bypass both.
 */
export function PuzzleStepIndicator({ flow, current }: Props) {
  const t = useTranslations('practice.puzzle.create');

  const steps: readonly (typeof FLOW_STEPS)['create'][number][] = FLOW_STEPS[flow];
  const currentIndex = steps.indexOf(current);
  const labels: Record<(typeof FLOW_STEPS)['create'][number], string> = {
    position: t('stepPosition'),
    solution: t('stepSolution'),
    preview: t('stepPreview'),
  };

  return (
    <ol
      aria-label={t('stepIndicatorLabel')}
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
    >
      {steps.map((key, i) => {
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
