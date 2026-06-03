'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { BoardVisibility } from '@/lib/games/board-visibility';

type Props = {
  value: BoardVisibility;
  onChange: (value: BoardVisibility) => void;
};

function ToggleRow({
  label,
  checked,
  onToggle,
  muted = false,
}: {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  /** Render the label in the muted/secondary colour, for nested sub-toggles. */
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onToggle(!checked)}
      className="flex w-full items-center justify-between gap-3 text-sm text-foreground"
    >
      <span className={muted ? 'text-muted-foreground' : undefined}>{label}</span>
      <span
        aria-hidden
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-foreground' : 'bg-secondary'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  );
}

/**
 * Board-visibility control. The underlying value is still the 3-state
 * {@link BoardVisibility} (`always` | `peek` | `never`) that the rest of the app
 * consumes, but it is presented as two nested yes/no toggles, which read more
 * simply than a 3-way picker:
 *
 *  - "Hide the board" (blindfold) — off ⇒ `always` (board always shown, never
 *    re-masks); on ⇒ blindfolded.
 *  - "Allow peeking" (only when blindfolded) — on ⇒ `peek` (tap to reveal,
 *    re-masks each move); off ⇒ `never` (stays hidden).
 *
 * Callers supply their own heading; this renders just the toggle group.
 */
export function BoardVisibilityPicker({ value, onChange }: Props) {
  const t = useTranslations('Preferences');
  const blindfold = value !== 'always';
  const peekAllowed = value === 'peek';

  return (
    <div className="space-y-3">
      <ToggleRow
        label={t('game.hideBoard')}
        checked={blindfold}
        // Enabling the blindfold defaults to the peekable mode (the practical
        // middle); disabling it returns to the always-shown board.
        onToggle={(on) => onChange(on ? 'peek' : 'always')}
      />
      {blindfold && (
        <div className="border-l border-border pl-4">
          <ToggleRow
            label={t('game.allowPeek')}
            checked={peekAllowed}
            onToggle={(on) => onChange(on ? 'peek' : 'never')}
            muted
          />
        </div>
      )}
    </div>
  );
}
