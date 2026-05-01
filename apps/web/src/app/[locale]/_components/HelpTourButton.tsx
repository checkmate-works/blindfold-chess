'use client';

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { FaQuestionCircle } from 'react-icons/fa';

export type HelpStep = {
  /** Value of the `data-tour-id` attribute on the target element. */
  targetId: string;
  title?: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
};

type Props = {
  steps: HelpStep[];
  /** aria-label for the trigger button. */
  label: string;
};

export function HelpTourButton({ steps, label }: Props) {
  const startTour = () => {
    const d = driver({
      showProgress: steps.length > 1,
      steps: steps.map((step) => ({
        element: `[data-tour-id="${step.targetId}"]`,
        popover: {
          title: step.title,
          description: step.description,
          side: step.side ?? 'bottom',
          align: step.align ?? 'start',
        },
      })),
    });

    d.drive();
  };

  if (steps.length === 0) return null;

  return (
    <button
      type="button"
      onClick={startTour}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label={label}
    >
      <FaQuestionCircle className="h-5 w-5" />
    </button>
  );
}
