'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaClipboardList } from 'react-icons/fa';

import type { GameStats, MoveMarker } from '@/lib/games/compute-game-stats';

import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

type Props = {
  stats: GameStats;
  /** moves[] index for each player move; cell i jumps to playerMoveIndices[i]. */
  playerMoveIndices: number[];
  /** SAN per moves[] index, for the per-move cell tooltips. */
  moves: string[];
  /** Jump to a finished-game position (moves[] index). */
  onSelectMove: (movesIndex: number) => void;
  /**
   * Open the Game Details modal (engine / settings / change log). Optional —
   * surfaces a "view details" button only when provided. Omitted on the shared
   * game detail page, which has no local preferences / change-log to show.
   */
  onViewDetails?: () => void;
};

/** Fill color for each effort marker (translucent so the board theme shows through). */
const MARKER_CLASS: Record<MoveMarker, string> = {
  clean: 'bg-success/40',
  peek: 'bg-sky-400/60',
  illegal: 'bg-destructive/70',
  takeback: 'bg-warning/70',
  hint: 'bg-violet-400/60',
};

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3 text-center">
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}

/**
 * Result-page overview of how the (finished) game was played — derived
 * entirely from the persisted per-move operation logs. Replaces the old flat
 * totals table with glanceable metric cards plus a per-move "effort strip"
 * that shows where peeks / mistakes clustered and links back into the
 * finished-game view at that exact position.
 */
export function GameStatsOverview({
  stats,
  playerMoveIndices,
  moves,
  onSelectMove,
  onViewDetails,
}: Props) {
  const t = useTranslations('play');

  const cleanRate =
    stats.totalMoves > 0 ? Math.round((stats.cleanMoves / stats.totalMoves) * 100) : 0;

  // Core cards always shown (a 0 is itself meaningful for a blindfold game);
  // peeks / hints only when they actually occurred.
  const cards: { value: string; label: string }[] = [
    { value: String(stats.totalMoves), label: t('result.stats.moves') },
    { value: `${cleanRate}%`, label: t('result.stats.cleanRate') },
    { value: String(stats.illegal), label: t('result.stats.illegal') },
    { value: String(stats.takebacks), label: t('result.stats.takebacks') },
  ];
  if (stats.peeks > 0) cards.push({ value: String(stats.peeks), label: t('result.stats.peeks') });
  if (stats.hints > 0) cards.push({ value: String(stats.hints), label: t('result.stats.hints') });

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FaClipboardList className="w-3.5 h-3.5" />
          <span>{t('result.stats.title')}</span>
        </div>
        {onViewDetails && (
          <button onClick={onViewDetails} className={`text-xs ${TEXT_LINK_MUTED_CLASSES}`}>
            {t('result.viewDetails')}
          </button>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {cards.map((card) => (
          <StatCard key={card.label} value={card.value} label={card.label} />
        ))}
      </div>

      {/* Per-move effort strip */}
      {stats.totalMoves > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t('result.stats.timelineTitle')}
            </span>
            <span className="text-[0.65rem] text-muted-foreground">
              {t('result.stats.timelineHint')}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {stats.perMove.map((marker, i) => {
              const movesIndex = playerMoveIndices[i];
              const san = movesIndex !== undefined ? moves[movesIndex] : undefined;
              const label = t('result.stats.moveCell', { number: i + 1 });
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => movesIndex !== undefined && onSelectMove(movesIndex)}
                  title={san ? `${label} ${san}` : label}
                  aria-label={san ? `${label} ${san}` : label}
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
      )}
    </div>
  );
}
