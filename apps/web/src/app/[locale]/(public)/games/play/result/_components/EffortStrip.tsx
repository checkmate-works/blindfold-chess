'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { GameStats, MoveMarker } from '@/lib/games/compute-game-stats';
import type { MoveOperationLog } from '@/lib/games/saved-game-types';

type Props = {
  stats: GameStats;
  /** moves[] index for each player move; cell i jumps to playerMoveIndices[i]. */
  playerMoveIndices: number[];
  /** SAN per moves[] index, for the per-move cell tooltips. */
  moves: string[];
  /**
   * Per-player-move operation logs, index-aligned with {@link GameStats.perMove}
   * — used to surface the rejected move texts (`invalidAttempts`) in a cell's
   * tooltip. Optional — cells fall back to the move SAN alone when absent.
   */
  operationLogs?: MoveOperationLog[];
  /** Jump to a finished-game position (moves[] index). */
  onSelectMove: (movesIndex: number) => void;
};

/** Fill color for each effort marker (translucent so the board theme shows through). */
const MARKER_CLASS: Record<MoveMarker, string> = {
  clean: 'bg-success/40',
  peek: 'bg-sky-400/60',
  illegal: 'bg-destructive/70',
  takeback: 'bg-warning/70',
  hint: 'bg-violet-400/60',
};

/**
 * The per-move "effort strip": one cell per player move, colored by what
 * happened at it (clean / peek / illegal / takeback / hint) and linking back
 * into the finished-game view at that exact position, plus a legend covering
 * only the markers that actually appear in this game. Split out of
 * {@link GameStatsOverview}.
 */
export function EffortStrip({
  stats,
  playerMoveIndices,
  moves,
  operationLogs,
  onSelectMove,
}: Props) {
  const t = useTranslations('play');

  // Legend entries for only the markers that appear in this game.
  const presentMarkers = (['illegal', 'takeback', 'peek', 'hint', 'clean'] as MoveMarker[]).filter(
    (m) => stats.perMove.includes(m)
  );
  const markerLabel: Record<MoveMarker, string> = {
    clean: t('result.stats.legendClean'),
    peek: t('result.stats.legendPeek'),
    illegal: t('result.stats.legendIllegal'),
    takeback: t('result.stats.legendTakeback'),
    hint: t('result.stats.legendHint'),
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t('result.stats.timelineTitle')}</h3>
        <span className="text-[0.65rem] text-muted-foreground">
          {t('result.stats.timelineHint')}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {stats.perMove.map((marker, i) => {
          const movesIndex = playerMoveIndices[i];
          const san = movesIndex !== undefined ? moves[movesIndex] : undefined;
          const label = t('result.stats.moveCell', { number: i + 1 });
          const base = san ? `${label} ${san}` : label;
          // Append the rejected move texts for this move, when captured, so a
          // hover over a red (illegal) cell shows what was tried.
          const attempts = (operationLogs?.[i]?.invalidAttempts ?? []).filter(
            (s) => typeof s === 'string'
          );
          const cellTitle =
            attempts.length > 0
              ? `${base} · ${t('result.stats.illegalTried', { moves: attempts.join(', ') })}`
              : base;
          return (
            <button
              key={i}
              type="button"
              onClick={() => movesIndex !== undefined && onSelectMove(movesIndex)}
              title={cellTitle}
              aria-label={cellTitle}
              className={`w-5 h-5 rounded-sm transition-transform hover:scale-125 hover:ring-2 hover:ring-foreground/40 ${MARKER_CLASS[marker]}`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
        {presentMarkers.map((marker) => (
          <span
            key={marker}
            className="flex items-center gap-1 text-[0.65rem] text-muted-foreground"
          >
            <span className={`w-3 h-3 rounded-sm ${MARKER_CLASS[marker]}`} />
            {markerLabel[marker]}
          </span>
        ))}
      </div>
    </div>
  );
}
