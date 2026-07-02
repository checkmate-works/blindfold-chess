import type { Side } from '@blindfold-chess/types';

import type { EngineConfig } from '@/lib/engines';

import type {
  Game,
  GamePlaySettings,
  MoveOperationLog,
  PlaySettingsChangeEntry,
} from './saved-game-types';

/**
 * Normalized, display-ready snapshot of a game for the shared `GameReview` UI.
 *
 * This is the single view model both surfaces feed into `GameReview`:
 * - `games/shared/[id]` maps its persisted `games` row into this shape.
 * - `games/play/result` maps the local (localStorage) {@link Game} into it via
 *   {@link toReviewData}.
 *
 * The blindfold settings are the *display subset* the icon-based
 * `PlaySettingsIndicator` renders — the same narrowing the publish path applies
 * (`normalizePlaySettings` / `normalizePlaySettingsLog` in `publish-game.ts`),
 * so a game looks identical before and after it is shared. Opening detection,
 * `locale`, and board `orientation` are environment/context concerns resolved by
 * each caller, so they are intentionally NOT part of this data model.
 */
export type GameReviewData = {
  moves: string[];
  startingFen: string | null;
  playerColor: Side;
  engineConfig: EngineConfig;
  operationLogs: MoveOperationLog[] | null;
  playSettings: GamePlaySettings | null;
  playSettingsLog: PlaySettingsChangeEntry[] | null;
};

/**
 * Project the start-of-game blindfold preferences onto the display subset the
 * `PlaySettingsIndicator` renders. Returns null for legacy games saved before
 * per-game preferences were persisted (the icons are then omitted).
 */
function toPlaySettings(gp: Game['gamePreferences']): GamePlaySettings | null {
  if (!gp) return null;
  return {
    boardVisibility: gp.boardVisibility,
    showOwnPieces: gp.showOwnPieces,
    showOpponentPieces: gp.showOpponentPieces,
    pieceShapeMode: gp.pieceShapeMode,
    pieceColors: gp.pieceColors,
    // Legacy snapshots predate pawnHideMode; treat a missing value as 'none'.
    pawnHideMode: gp.pawnHideMode ?? 'none',
  };
}

/**
 * Narrow the mid-game preference change log to the display subset, `to`-only —
 * matching the shape stored for a published game. Input-assist / UI-only keys
 * (`highlightLastMove`, `showPieceDestinations`, `moveInputMode`) are dropped.
 * A per-key switch (rather than a generic push) is required so each entry keeps
 * its `key`↔`to` correlation from the {@link PlaySettingsChangeEntry} union.
 */
function toPlaySettingsLog(log: Game['preferenceChangeLog']): PlaySettingsChangeEntry[] | null {
  if (!log) return null;
  const out: PlaySettingsChangeEntry[] = [];
  for (const e of log) {
    switch (e.key) {
      case 'showOwnPieces':
      case 'showOpponentPieces':
        out.push({ atMoveIndex: e.atMoveIndex, key: e.key, to: e.to });
        break;
      case 'boardVisibility':
        out.push({ atMoveIndex: e.atMoveIndex, key: e.key, to: e.to });
        break;
      case 'pieceShapeMode':
        out.push({ atMoveIndex: e.atMoveIndex, key: e.key, to: e.to });
        break;
      case 'pieceColors':
        out.push({ atMoveIndex: e.atMoveIndex, key: e.key, to: e.to });
        break;
      case 'pawnHideMode':
        out.push({ atMoveIndex: e.atMoveIndex, key: e.key, to: e.to });
        break;
      // highlightLastMove / showPieceDestinations / moveInputMode: non-display.
    }
  }
  return out;
}

/**
 * Map a local (localStorage) {@link Game} into the {@link GameReviewData} view
 * model, so `games/play/result` can render the same `GameReview` as a published
 * game. Pure and environment-agnostic.
 */
export function toReviewData(game: Game): GameReviewData {
  return {
    moves: game.moves,
    startingFen: game.startingFen ?? null,
    playerColor: game.playerColor,
    engineConfig: game.engineConfig,
    operationLogs: game.operationLogs ?? null,
    playSettings: toPlaySettings(game.gamePreferences),
    playSettingsLog: toPlaySettingsLog(game.preferenceChangeLog),
  };
}
