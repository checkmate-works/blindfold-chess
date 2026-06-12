'use client';

import Image from 'next/image';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaClipboardList } from 'react-icons/fa';

import type { EngineConfig } from '@/lib/engines';
import { ENGINE_LOGO_SRC } from '@/lib/engines';
import type { GameStats, MoveMarker } from '@/lib/games/compute-game-stats';
import { playSettingsAtHalfMove } from '@/lib/games/play-settings-log';
import type {
  GamePlaySettings,
  PlaySettingsChangeEntry,
  PreferenceChangeLogEntry,
} from '@/lib/games/saved-game-types';
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
   * Mid-game blindfold-setting changes (display subset). When non-empty, a
   * "change log" renders under the By Move strip: one icon row per change
   * point showing how the setup looked from that move onward (folded snapshot),
   * using the same {@link PlaySettingsIndicator} icons as the initial settings.
   * Empty / undefined for the common case (no mid-game edits) — nothing shown.
   */
  playSettingsLog?: PlaySettingsChangeEntry[];
  /**
   * Full mid-game preference change log (with `from` values), used to annotate
   * each change-point row with the exact "Label: from → to" transition so the
   * direction of each edit is unambiguous (the icon snapshot alone only shows
   * the resulting state). Result-page only — published games persist just the
   * `to` subset, so the shared detail page leaves this undefined and shows the
   * icon snapshot alone.
   */
  preferenceChangeLog?: PreferenceChangeLogEntry[];
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
 * Change-log keys whose from→to text is surfaced under each change-point row.
 * Scoped to the display-relevant blindfold settings so the text mirrors what the
 * icon snapshot above it shows (input-mode / aiReplyDuration edits stay in the
 * fuller Game Details modal). The icon snapshot is a *resulting state* and so
 * cannot convey direction (was a setting turned on or off?); the from→to text
 * resolves that — it's only available on the result page, where the full
 * `preferenceChangeLog` (with `from`) is in localStorage. Published games persist
 * only the `to` subset, so the shared page omits this prop and shows icons alone.
 */
const DISPLAY_CHANGE_KEYS = new Set<PreferenceChangeLogEntry['key']>([
  'boardVisibility',
  'showOwnPieces',
  'showOpponentPieces',
  'pieceShapeMode',
  'pieceColors',
  'pawnHideMode',
]);

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
 * `playSettingsLog`-driven change log under the By Move strip that shows each
 * change point as the same settings icons. The shared game detail page omits
 * those and keeps its own modal.
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
  preferenceChangeLog,
  headingAsSection = false,
  showInitialSettings = true,
}: Props) {
  const t = useTranslations('play');
  const openingNameT = useTranslations('topics.openings.names');
  // Localised "Label: from → to" formatting for the per-change-point delta text,
  // shared with the Game Details modal so the wording stays in lockstep.
  const { settingLabel, settingValue } = useChangeLogFormat();

  // Distinct change points (a single move may carry several simultaneous edits;
  // collapse them into one snapshot row per move). Set preserves insertion
  // order, and the log is already in move order.
  const changePoints =
    playSettings && playSettingsLog && playSettingsLog.length > 0
      ? [...new Set(playSettingsLog.map((e) => e.atMoveIndex))]
      : [];

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

      {/* Change log — only when the player edited a blindfold setting mid-game
          (rare). One row per change point: a move-number badge plus how the
          setup looked from that move onward (folded snapshot), rendered with the
          same icons as the initial settings above. Placed under the By Move
          strip so the timeline reads top-to-bottom: where effort clustered,
          then where the setup changed. */}
      {playSettings && playerColor && changePoints.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t('operationLog.changeLog.title')}
          </span>
          <ul className="space-y-1.5">
            {changePoints.map((atMoveIndex) => {
              // The exact edits made at this move (display-relevant only), each
              // shown as "Label: from → to" so the direction is explicit. Empty
              // on the shared page (no full log passed) → icon snapshot alone.
              const deltas = (preferenceChangeLog ?? []).filter(
                (e) => e.atMoveIndex === atMoveIndex && DISPLAY_CHANGE_KEYS.has(e.key)
              );
              return (
                <li key={atMoveIndex} className="flex items-start gap-2">
                  <span
                    className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm bg-muted px-1 text-[0.65rem] tabular-nums text-muted-foreground"
                    title={t('operationLog.changeLog.columnAtMove')}
                  >
                    {atMoveIndex}
                  </span>
                  <div className="flex flex-col gap-1">
                    <PlaySettingsIndicator
                      settings={playSettingsAtHalfMove(playSettings, playSettingsLog, atMoveIndex)}
                      playerColor={playerColor}
                      label={null}
                    />
                    {deltas.length > 0 && (
                      <ul className="flex flex-col gap-0.5">
                        {deltas.map((e, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            <span className="text-foreground">{settingLabel(e.key)}</span>
                            {': '}
                            {settingValue(e, 'from')} → {settingValue(e, 'to')}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
