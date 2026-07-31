'use client';

type Step = {
  /** Stable identity for the step; compared against `current` and used as the React key. */
  key: string;
  /** Already-translated label. Callers own their own i18n namespace. */
  label: string;
};

type Props = {
  steps: readonly Step[];
  current: string;
  ariaLabel: string;
};

/**
 * "1 Position › 2 Preview" progress line shown under the page heading of the
 * free-play authoring flows. Purely informational — the steps are not links,
 * since moving between them must go through each form's own Continue/Back
 * actions (which persist the draft, and in the puzzle flow run the
 * position-changed guard); a bare navigation would bypass that.
 *
 * Presentational only: it takes pre-translated labels rather than a
 * translation namespace, so position-memory (2 steps) and puzzle (3 steps)
 * can share one rendering without either owning the other's messages.
 */
export function StepIndicator({ steps, current, ariaLabel }: Props) {
  const currentIndex = steps.findIndex((step) => step.key === current);

  return (
    <ol aria-label={ariaLabel} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {steps.map(({ key, label }, i) => {
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
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
