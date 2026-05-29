'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { BoardVisibility } from '@/lib/games/board-visibility';
import { BOARD_VISIBILITY_VALUES } from '@/lib/games/board-visibility';
import { BOARD_VISIBILITY_ICON } from '@/lib/games/board-visibility-icons';

type Props = {
  value: BoardVisibility;
  onChange: (value: BoardVisibility) => void;
  /**
   * Stretch the segmented buttons to fill the available width (`flex` with
   * `flex-1` buttons). Used by the new-game form and the global Preferences
   * "Game" tab, which have a full-width column to fill. When `false` the
   * picker renders as a compact `inline-flex` group — used by the mid-game
   * settings modal, where it sits in a denser layout. Defaults to `false`.
   */
  fullWidth?: boolean;
};

/**
 * Board-visibility segmented picker (always / peek / never) — the button group
 * only. Callers supply their own heading/description so the surrounding copy
 * can differ per surface. Shared so the two width variants stay in lockstep.
 */
export function BoardVisibilityPicker({ value, onChange, fullWidth = false }: Props) {
  const t = useTranslations('Preferences');

  return (
    <div
      className={`${fullWidth ? 'flex' : 'inline-flex'} rounded-md border border-border overflow-hidden`}
    >
      {BOARD_VISIBILITY_VALUES.map((option, idx) => {
        const Icon = BOARD_VISIBILITY_ICON[option];
        const isLast = idx === BOARD_VISIBILITY_VALUES.length - 1;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              fullWidth ? 'flex-1 px-3 py-1.5' : 'px-4 py-2'
            } ${
              value === option
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground hover:bg-muted'
            } ${isLast ? '' : 'border-r border-border'}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t(`game.boardVisibilities.${option}`)}
          </button>
        );
      })}
    </div>
  );
}
