'use client';

import type { ReactNode } from 'react';

type Props = {
  /** `data-tour-id` so the help tour can point at this card. */
  tourId: string;
  icon: ReactNode;
  title: string;
  description: string;
  /** Invoked on click. Ignored while {@link comingSoon} is set. */
  onClick?: () => void;
  /** Render a "coming soon" overlay and disable the card. */
  comingSoon?: boolean;
  comingSoonLabel?: string;
};

/**
 * A single choice on the game-finished modal, rendered as a card rather than a
 * plain button so each destination (result / game review / kata) reads as its
 * own thing with an icon + explanation. The help tour anchors to `tourId`.
 * A `comingSoon` card is disabled and veiled by a labelled overlay.
 */
export function FinishChoiceCard({
  tourId,
  icon,
  title,
  description,
  onClick,
  comingSoon = false,
  comingSoonLabel,
}: Props) {
  const disabled = comingSoon || !onClick;

  return (
    <button
      type="button"
      data-tour-id={tourId}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className="relative flex h-full w-full flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
    >
      <span className="text-2xl text-primary">{icon}</span>
      <span className="text-base font-semibold text-foreground">{title}</span>
      <span className="text-sm text-muted-foreground">{description}</span>

      {comingSoon && (
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70">
          <span className="text-xs font-medium text-muted-foreground">{comingSoonLabel}</span>
        </span>
      )}
    </button>
  );
}
