'use client';

import Image from 'next/image';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaClipboardList } from 'react-icons/fa';

import type { EngineConfig } from '@/lib/engines';
import { ENGINE_LOGO_SRC } from '@/lib/engines';
import type { GameStats, MoveMarker } from '@/lib/games/compute-game-stats';
import { resolvePlaySettingsChanges } from '@/lib/games/play-settings-log';
import type { GamePlaySettings, PlaySettingsChangeEntry } from '@/lib/games/saved-game-types';
import type { DetectedOpening } from '@/lib/openings/detect-game-opening';

import { useChangeLogFormat } from '@/app/[locale]/(public)/games/play/_hooks/use-change-log-format';
import { PlaySettingsIndicator } from '@/app/[locale]/(public)/games/shared/[id]/_components/PlaySettingsIndicator';
import { GameColorOpeningRow } from '@/app/[locale]/(public)/games/shared/_components/GameColorOpeningRow';
import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

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
  /**
   * AI opponent + difficulty. When provided, a compact one-line engine badge
   * (logo + name + difficulty) renders inline in place of the old Game Details
   * modal's "Opponent" section. The shared game detail page omits it (it shows
   * the opponent elsewhere).
   */
  engineConfig?: EngineConfig;
  /**
   * Start-of-game blindfold settings. When provided (with {@link playerColor}),
   * the icon-based {@link PlaySettingsIndicator} renders inline as the
   * "Initial Settings" summary, replacing the modal's text table.
   */
  playSettings?: GamePlaySettings;
  /** Player's side — needed by {@link PlaySettingsIndicator} for the piece sample. */
  playerColor?: 'white' | 'black';
  /**
   * The opening the player reached, shown (with a player-colour icon) on its own
   * row under the engine badge and linked to its topic page. Passing this prop —
   * even as `null` — opts the row in (so the player's colour is always shown on
   * the result page); omitting it (the shared detail page) leaves the row out,
   * since that page surfaces the opening above the board instead.
   */
  opening?: DetectedOpening | null;
  /** Locale for the opening link. Required to render the {@link opening} row. */
  locale?: Locale;
  /**
   * Mid-game blindfold-setting changes (display subset, `to`-only). When
   * non-empty, a change log renders under the By Move strip: one row per change
   * point listing the exact "Label: from → to" transition(s) for the settings
   * edited at that move. The `from` of each transition is reconstructed by
   * folding this log over {@link playSettings} (see `resolvePlaySettingsChanges`),
   * so the result page and the shared replay render an identical change log from
   * the same inputs. Empty / undefined for the common case (no mid-game edits).
   */
  playSettingsLog?: PlaySettingsChangeEntry[];
  /**
   * Render the heading as a page-level {@link SectionTitle} (underlined h2)
   * instead of the compact inline label. The result page uses this so Game
   * Stats reads as a top-level section; the shared game detail page keeps the
   * inline label + view-details button (its default).
   */
  headingAsSection?: boolean;
  /**
   * Whether to render the initial-settings icon row. Defaults to `true`. The
   * shared game detail page sets it `false` because it already shows a richer,
   * position-aware settings indicator under the board, so a static initial row
   * here would duplicate it. `playSettings` is still consumed for the change
   * log fold even when this is `false`.
   */
  showInitialSettings?: boolean;
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
 * Result-page overview of how the (finished) game was played — derived
 * entirely from the persisted per-move operation logs. A per-move "effort
 * strip" shows where peeks / mistakes clustered and links back into the
 * finished-game view at that exact position. (The earlier aggregate metric
 * cards — Moves / Clean Moves / Illegal Attempts / Undos — were removed as
 * redundant: the totals are self-evident from the effort strip and notation.)
 *
 * On the result page it also inlines the former Game Details modal's opponent
 * and initial-settings summary (compact engine badge + icon-based
 * {@link PlaySettingsIndicator}) via the optional `engineConfig` / `playSettings`
 * props, and — when the player changed a blindfold setting mid-game — a
 * `playSettingsLog`-driven change log under the By Move strip listing each
 * edit as a "Label: from → to" transition. Both the result page and the shared
 * detail page render it from the same (snapshot + to-only log) inputs.
 */
export function GameStatsOverview({
  stats,
  playerMoveIndices,
  moves,
  onSelectMove,
  onViewDetails,
  engineConfig,
  playSettings,
  playerColor,
  opening,
  locale,
  playSettingsLog,
  headingAsSection = false,
  showInitialSettings = true,
}: Props) {
  const t = useTranslations('play');
  const openingNameT = useTranslations('topics.openings.names');
  // Localised "Label: from → to" formatting for the per-change-point delta text,
  // shared with the Game Details modal so the wording stays in lockstep.
  const { settingLabel, settingValue } = useChangeLogFormat();

  // Reconstruct the full from→to transitions from the start-of-game snapshot
  // plus the to-only log (works on the result page and the shared replay alike),
  // then group them by move into change-point rows. Set preserves insertion
  // order, and the log is already in move order.
  const resolvedChanges = playSettings
    ? resolvePlaySettingsChanges(playSettings, playSettingsLog)
    : [];
  const changePoints = [...new Set(resolvedChanges.map((e) => e.atMoveIndex))];

  // Compact engine label: "Maia 1600 ELO" / "Stockfish Level 5". The logo
  // carries the engine identity; the name + difficulty sit beside it on one line.
  const engineName = engineConfig?.kind === 'maia' ? 'Maia' : 'Stockfish';
  const engineDifficulty =
    engineConfig?.kind === 'maia'
      ? t('engineInfo.maiaDifficulty', { rating: engineConfig.rating })
      : engineConfig
        ? t('engineInfo.stockfishDifficulty', { level: engineConfig.skillLevel })
        : '';

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
      {headingAsSection ? (
        <SectionTitle>{t('result.stats.title')}</SectionTitle>
      ) : (
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
      )}

      {/* Opponent + initial settings, inlined from the old Game Details modal.
          Both are optional. The initial-settings row is suppressed on the
          shared page (showInitialSettings=false), which shows a position-aware
          indicator under the board instead. */}
      {(engineConfig || (showInitialSettings && playSettings && playerColor)) && (
        <div className="flex flex-col gap-2">
          {engineConfig && (
            <span
              className="inline-flex items-center gap-1.5 text-xs"
              title={`${engineName} ${engineDifficulty}`}
            >
              <Image
                src={ENGINE_LOGO_SRC[engineConfig.kind]}
                alt=""
                width={18}
                height={18}
                className="object-contain"
              />
              <span className="font-medium text-foreground">{engineName}</span>
              <span className="text-muted-foreground">{engineDifficulty}</span>
            </span>
          )}
          {/* Which side the player had, plus the opening they reached. The
              colour chip removes the "who was white?" ambiguity of the bare
              engine line; the opening links to its topic page. Shared with the
              gallery card so both render identically. */}
          {playerColor && opening !== undefined && locale && (
            <GameColorOpeningRow
              playerColor={playerColor}
              colorLabel={t(`playerColor.${playerColor}`)}
              opening={opening}
              openingDisplayName={
                opening
                  ? getOpeningDisplayName(openingNameT, opening.slug, opening.name)
                  : undefined
              }
              locale={locale}
            />
          )}
          {showInitialSettings && playSettings && playerColor && (
            <PlaySettingsIndicator
              settings={playSettings}
              playerColor={playerColor}
              label={t('operationLog.initialSettings.title')}
            />
          )}
        </div>
      )}

      {/* Per-move effort strip */}
      {stats.totalMoves > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t('result.stats.timelineTitle')}
            </h3>
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

      {/* Change log — only when the player edited a blindfold setting mid-game
          (rare). One row per change point: a move-number badge plus the exact
          "Label: from → to" transition(s) for the settings edited at that move
          (only what actually changed, so an unrelated setting never reads as
          "changed"). Identical on the result page and the shared replay — both
          fold the to-only log over the snapshot to recover each `from`. Placed
          under the By Move strip so the timeline reads top-to-bottom: where
          effort clustered, then where the setup changed. */}
      {resolvedChanges.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t('operationLog.changeLog.title')}
          </h3>
          <ul className="space-y-1.5">
            {changePoints.map((atMoveIndex) => {
              const entries = resolvedChanges.filter((e) => e.atMoveIndex === atMoveIndex);
              return (
                <li key={atMoveIndex} className="flex items-start gap-2">
                  <span
                    className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm bg-muted px-1 text-[0.65rem] tabular-nums text-muted-foreground"
                    title={t('operationLog.changeLog.columnAtMove')}
                  >
                    {atMoveIndex}
                  </span>
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
      )}
    </div>
  );
}
