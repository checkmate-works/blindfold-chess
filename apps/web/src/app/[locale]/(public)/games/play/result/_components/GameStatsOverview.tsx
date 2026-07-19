'use client';

import type { ReactNode } from 'react';

import Image from 'next/image';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaClipboardList } from 'react-icons/fa';

import type { EngineConfig } from '@/lib/engines';
import { ENGINE_LOGO_SRC } from '@/lib/engines';
import type { GameStats } from '@/lib/games/compute-game-stats';
import type {
  GamePlaySettings,
  MoveOperationLog,
  PlaySettingsChangeEntry,
} from '@/lib/games/saved-game-types';
import type { DetectedOpening } from '@/lib/openings/detect-game-opening';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import { PlaySettingsIndicator } from '@/app/[locale]/(public)/games/shared/[id]/_components/PlaySettingsIndicator';
import { GameColorOpeningRow } from '@/app/[locale]/(public)/games/shared/_components/GameColorOpeningRow';
import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { EffortStrip } from './EffortStrip';
import { PlaySettingsChangeLog } from './PlaySettingsChangeLog';

type Props = {
  stats: GameStats;
  /** moves[] index for each player move; cell i jumps to playerMoveIndices[i]. */
  playerMoveIndices: number[];
  /**
   * Per-player-move operation logs, index-aligned with {@link GameStats.perMove}
   * (cell i ↔ operationLogs[i]). Used to surface the rejected move texts
   * (`invalidAttempts`) in the effort-strip cell tooltip. Optional — cells fall
   * back to the move SAN alone when absent.
   */
  operationLogs?: MoveOperationLog[];
  /** SAN per moves[] index, for the per-move cell tooltips. */
  moves: string[];
  /** Jump to a finished-game position (moves[] index, or -2 for the initial board). */
  onSelectMove: (movesIndex: number) => void;
  /**
   * The position the game actually started from — a custom FEN, a seeded
   * opening/PGN prefix, or both — rendered as a small board inside Initial
   * Settings, so the "this game didn't start from move one" fact survives
   * into the summary. `movesLine` captions how the position was reached
   * (null for FEN-only starts); clicking the board jumps the review to
   * `jumpIndex` via {@link onSelectMove}. Null/omitted for standard starts.
   */
  startPosition?: { fen: string; movesLine: string | null; jumpIndex: number } | null;
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
   * The position the game started from, forwarded to {@link PlaySettingsChangeLog}
   * so its move badges read as PGN move numbers instead of a raw half-move count.
   */
  startingFen?: string | null;
  /**
   * Render the heading as a page-level {@link SectionTitle} (underlined h2)
   * instead of the compact inline label. The result page uses this so Game
   * Stats reads as a top-level section; the shared game detail page keeps the
   * inline label + view-details button (its default).
   */
  headingAsSection?: boolean;
  /**
   * Content rendered directly under the section heading — used by the result
   * screen for its win/loss/draw label, so the outcome reads as the first line
   * of the Game Stats section. Omitted on the shared game detail page.
   */
  afterTitle?: ReactNode;
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
  operationLogs,
  moves,
  onSelectMove,
  onViewDetails,
  engineConfig,
  playSettings,
  playerColor,
  startPosition,
  opening,
  locale,
  playSettingsLog,
  startingFen,
  headingAsSection = false,
  afterTitle,
}: Props) {
  const t = useTranslations('play');
  const openingNameT = useTranslations('topics.openings.names');

  // Compact engine label: "Maia 1600 ELO" / "Stockfish Level 5". The logo
  // carries the engine identity; the name + difficulty sit beside it on one line.
  const engineName = engineConfig?.kind === 'maia' ? 'Maia' : 'Stockfish';
  const engineDifficulty =
    engineConfig?.kind === 'maia'
      ? t('engineInfo.maiaDifficulty', { rating: engineConfig.rating })
      : engineConfig
        ? t('engineInfo.stockfishDifficulty', { level: engineConfig.skillLevel })
        : '';

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

      {/* Caller-supplied line directly under the heading (the result screen's
          win/loss/draw label). */}
      {afterTitle}

      {/* Initial settings — the opponent (engine + difficulty), the side the
          player had with the opening reached, and the blindfold display
          settings: everything configured before the game. Grouped under one h3
          so it reads at the same level as By Move / Change Log, and so the
          engine / colour rows aren't left heading-less. On the shared replay the
          under-board position-aware indicator complements (not duplicates) this
          static start-of-game snapshot. */}
      {(engineConfig || (playSettings && playerColor) || startPosition) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t('operationLog.initialSettings.title')}
          </h3>
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
            {playSettings && playerColor && (
              <PlaySettingsIndicator
                settings={playSettings}
                playerColor={playerColor}
                label={null}
              />
            )}
            {/* The position the game started from — only for games that did
                not start at move one (custom FEN / seeded opening or PGN).
                Clicking jumps the review to that position. Shown from the
                player's perspective, like the board above. */}
            {startPosition && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {t('operationLog.initialSettings.startingPosition')}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectMove(startPosition.jumpIndex)}
                  className="block rounded-sm hover:opacity-80 transition-opacity"
                  title={t('operationLog.initialSettings.startingPosition')}
                >
                  <BoardThumbnail
                    fen={startPosition.fen}
                    flipped={playerColor === 'black'}
                    className="w-28 h-28 sm:w-32 sm:h-32"
                  />
                </button>
                {startPosition.movesLine && (
                  <p className="max-w-xs text-xs text-muted-foreground">
                    {startPosition.movesLine}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Per-move effort strip */}
      {stats.totalMoves > 0 && (
        <EffortStrip
          stats={stats}
          playerMoveIndices={playerMoveIndices}
          moves={moves}
          operationLogs={operationLogs}
          onSelectMove={onSelectMove}
        />
      )}

      {/* Change log — only when the player edited a blindfold setting mid-game
          (rare). Placed under the By Move strip so the timeline reads
          top-to-bottom: where effort clustered, then where the setup changed. */}
      {playSettings && (
        <PlaySettingsChangeLog
          playSettings={playSettings}
          playSettingsLog={playSettingsLog}
          startingFen={startingFen}
          onSelectMove={onSelectMove}
        />
      )}
    </div>
  );
}
