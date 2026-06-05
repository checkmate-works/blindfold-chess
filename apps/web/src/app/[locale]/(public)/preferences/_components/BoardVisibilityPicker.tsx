'use client';

import type { ReactNode } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaEyeSlash, FaHandPointer } from 'react-icons/fa';

import type { BoardVisibility } from '@/lib/games/board-visibility';

type Props = {
  value: BoardVisibility;
  onChange: (value: BoardVisibility) => void;
  /**
   * Optional extra control rendered inside the blindfold group, right after
   * "Allow peeking" and indented identically — used for board-hidden-only
   * sub-settings (e.g. the AI move display time). Only shown while blindfolded
   * (`value !== 'always'`), since that is the only time it is relevant.
   */
  blindfoldExtra?: ReactNode;
};

function ToggleRow({
  label,
  checked,
  onToggle,
  muted = false,
  icon,
}: {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  /** Render the label in the muted/secondary colour, for nested sub-toggles. */
  muted?: boolean;
  /** Small leading visual-aid icon shown before the label. */
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onToggle(!checked)}
      className="flex w-full items-center justify-between gap-3 text-sm text-foreground"
    >
      <span className="flex items-center gap-1.5">
        {icon}
        <span className={muted ? 'text-muted-foreground' : undefined}>{label}</span>
      </span>
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
export function BoardVisibilityPicker({ value, onChange, blindfoldExtra }: Props) {
  const t = useTranslations('Preferences');
  const blindfold = value !== 'always';
  const peekAllowed = value === 'peek';

  return (
    <div className="space-y-3">
      <ToggleRow
        label={t('game.hideBoard')}
        checked={blindfold}
        icon={<FaEyeSlash className="h-4 w-4 text-muted-foreground" aria-hidden />}
        // Enabling the blindfold defaults to the peekable mode (the practical
        // middle); disabling it returns to the always-shown board.
        onToggle={(on) => onChange(on ? 'peek' : 'always')}
      />
      {blindfold && (
        <div className="border-l border-border pl-4">
          <ToggleRow
            label={t('game.allowPeek')}
            checked={peekAllowed}
            icon={<FaHandPointer className="h-4 w-4 text-muted-foreground" aria-hidden />}
            onToggle={(on) => onChange(on ? 'peek' : 'never')}
            muted
          />
        </div>
      )}
      {blindfold && blindfoldExtra && (
        <div className="border-l border-border pl-4">{blindfoldExtra}</div>
      )}
    </div>
  );
}
