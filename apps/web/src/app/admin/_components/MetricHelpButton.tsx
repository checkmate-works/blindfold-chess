'use client';

import { useState } from 'react';

import { InfoModal } from '@/app/_components/InfoModal';
import { FaInfoCircle } from 'react-icons/fa';

type Props = {
  /** Modal title. Usually the metric name being explained. */
  title: string;
  /** Modal body text. Plain string; line breaks are rendered as paragraphs. */
  description: string;
  /** aria-label for the trigger button (describes the action for screen readers). */
  ariaLabel: string;
};

/**
 * Small inline "?" info trigger for metrics in the admin KPI table.
 * Opens an {@link InfoModal} on click explaining the metric definition.
 */
export function MetricHelpButton({ title, description, ariaLabel }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  // Split on blank lines so callers can pass multi-paragraph copy via "\n\n".
  const paragraphs = description.split(/\n\n+/).filter((p) => p.trim().length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors align-middle"
        aria-label={ariaLabel}
      >
        <FaInfoCircle className="w-3.5 h-3.5" />
      </button>

      <InfoModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={title}>
        <div className="space-y-3 text-sm text-foreground">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </InfoModal>
    </>
  );
}
