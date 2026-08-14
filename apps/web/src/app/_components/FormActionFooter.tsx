'use client';

import type { ReactNode } from 'react';

type FormActionFooterProps = {
  /**
   * The primary action — a full-width `<Button variant="primary" size="lg">`.
   * Passed in rather than configured through props because its `type`,
   * `disabled` expression, and whether it shows a spinner genuinely differ
   * per form (submit vs. click handler, `pending` vs. `pending || !isDirty`).
   */
  children: ReactNode;
  /** Quiet secondary affordance below it. Omit to render none. */
  cancel?: {
    label: ReactNode;
    onClick: () => void;
    disabled?: boolean;
  };
};

/**
 * The action block at the foot of an editing form: a full-width primary
 * button, with a quiet text-style cancel underneath.
 *
 * Nine forms — chunk, repertoire, line, line order, position, puzzle, both
 * edit-request forms, and post editing — spelled out the same wrapper and the
 * same eleven-class cancel button. Three of them carried a comment saying
 * they mirror one of the others, which is the usual sign that the mirroring
 * was manual.
 *
 * The cancel is a `<button>` with an `onClick`, never a `<Link>`, on purpose:
 * every one of these forms sits behind an unsaved-changes navigation guard,
 * and a real link would leave the page without the guard getting a chance to
 * intercept.
 */
export function FormActionFooter({ children, cancel }: FormActionFooterProps) {
  return (
    <div className="space-y-4">
      {children}
      {cancel && (
        <button
          type="button"
          onClick={cancel.onClick}
          disabled={cancel.disabled}
          className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {cancel.label}
        </button>
      )}
    </div>
  );
}
