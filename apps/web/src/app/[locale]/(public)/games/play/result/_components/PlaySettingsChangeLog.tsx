'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { resolvePlaySettingsChanges } from '@/lib/games/play-settings-log';
import type { GamePlaySettings, PlaySettingsChangeEntry } from '@/lib/games/saved-game-types';

import { useChangeLogFormat } from '@/app/[locale]/(public)/games/play/_hooks/use-change-log-format';
import { formatChangeLogMoveLabel } from '@/app/[locale]/(public)/games/play/_lib/format-change-log-move-label';

type Props = {
  /** Start-of-game blindfold settings snapshot — the baseline each `from` folds onto. */
  playSettings: GamePlaySettings;
  /** Mid-game blindfold-setting changes (display subset, `to`-only). */
  playSettingsLog?: PlaySettingsChangeEntry[];
  /**
   * The position the game started from, needed to convert each entry's
   * `atMoveIndex` (a half-moves-played count) into the PGN-style move-number
   * badge ("26...") instead of the raw count. Null/undefined for a plain
   * standard start (move-one-based numbering).
   */
  startingFen?: string | null;
  /**
   * Jump to the finished-game position the change was made at (moves[]
   * index, or -2 for the initial board) — same navigation `EffortStrip`'s
   * cells use, so clicking a change-log badge shows exactly what the board
   * looked like when that setting was edited.
   */
  onSelectMove: (movesIndex: number) => void;
};

/**
 * The mid-game blindfold-settings change log, shown under the effort strip only
 * when the player edited a setting during the game (rare). One row per change
 * point: a move-number badge plus the exact "Label: from → to" transition(s)
 * for the settings edited at that move (only what actually changed, so an
 * unrelated setting never reads as "changed"). Each `from` is reconstructed by
 * folding the to-only log over the start-of-game snapshot
 * (`resolvePlaySettingsChanges`), so the result page and the shared replay
 * render an identical log. Renders nothing when there were no mid-game edits.
 * Split out of {@link GameStatsOverview}.
 */
export function PlaySettingsChangeLog({
  playSettings,
  playSettingsLog,
  startingFen,
  onSelectMove,
}: Props) {
  const t = useTranslations('play');
  // Localised "Label: from → to" formatting, shared with the Game Details modal
  // so the wording stays in lockstep.
  const { settingLabel, settingValue } = useChangeLogFormat();

  // Reconstruct the full from→to transitions from the snapshot plus the to-only
  // log, then group them by move. Set preserves insertion order, and the log is
  // already in move order.
  const resolvedChanges = resolvePlaySettingsChanges(playSettings, playSettingsLog);
  if (resolvedChanges.length === 0) return null;
  const changePoints = [...new Set(resolvedChanges.map((e) => e.atMoveIndex))];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{t('operationLog.changeLog.title')}</h3>
      <ul className="space-y-1.5">
        {changePoints.map((atMoveIndex) => {
          const entries = resolvedChanges.filter((e) => e.atMoveIndex === atMoveIndex);
          const moveLabel =
            formatChangeLogMoveLabel(atMoveIndex, startingFen) ??
            t('operationLog.changeLog.atStart');
          // Same "count of half-moves played" → moves[] index conversion as
          // formatChangeLogMoveLabel: the position right after the move that
          // was just played, or the initial board when the change predates
          // the first move.
          const movesIndex = atMoveIndex > 0 ? atMoveIndex - 1 : -2;
          return (
            <li key={atMoveIndex} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => onSelectMove(movesIndex)}
                title={t('operationLog.changeLog.columnAtMove')}
                className="inline-flex h-5 min-w-fit shrink-0 items-center justify-center rounded-sm bg-muted px-1 text-[0.65rem] tabular-nums text-muted-foreground transition-transform hover:scale-110 hover:ring-2 hover:ring-foreground/40"
              >
                {moveLabel}
              </button>
              <ul className="flex flex-col gap-0.5 pt-0.5">
                {entries.map((e, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    <span className="text-foreground">{settingLabel(e.key)}</span>
                    {': '}
                    {settingValue(e, 'from')} → {settingValue(e, 'to')}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
