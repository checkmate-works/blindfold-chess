import type { BlindfoldDisplaySettings } from '@blindfold-chess/features/board-display';
import { replayMoves } from '@blindfold-chess/features/chess-core';

import type { GameRecord } from '@/lib/db/schema';
import type { GameGifVariant } from '@/lib/games/gif/constants';
import { parseAttemptSquares } from '@/lib/games/gif/parse-attempt-squares';
import { playSettingsAtHalfMove } from '@/lib/games/play-settings-log';
import {
  foldPlaySettingsToDisplay,
  playSettingsDisplayAtHalfMove,
} from '@/lib/games/play-settings-thumbnail';
import type { GamePlaySettings, MoveOperationLog } from '@/lib/games/saved-game-types';

import { getPlayerMoveIndices } from '@/app/[locale]/(public)/games/play/_lib/move-ops-alignment';

/**
 * Total rendered frames — real positions AND annotation frames together.
 * Real positions take priority: `selectRealFrames` truncates long games
 * first, and annotations for player-move slots are then added front-to-back
 * only while budget remains (see {@link buildGameFrames}).
 */
export const MAX_FRAMES = 241;

const DELAY_FIRST_MS = 1000;
const DELAY_MOVE_MS = 800;
const DELAY_LAST_MS = 4000;
/** Peek reveal frame: as long as a real move, since it's the whole point. */
const DELAY_PEEK_MS = 800;
/** Illegal-attempt marker frame — brief, there are up to 3 per slot. */
const DELAY_ILLEGAL_MS = 500;
/** "Snap back to the real position" frame after an illegal-attempt marker. */
const DELAY_REVERT_MS = 250;
/**
 * Cap on invalid attempts drawn per move slot. `invalidAttempts` can hold up
 * to 20 entries (see {@link MoveOperationLog.invalidAttempts}); drawing all of
 * them would make a single indecisive move dominate the whole GIF, so only
 * the first few (in attempt order) get a frame.
 */
const MAX_ILLEGAL_ATTEMPTS_DRAWN = 3;

/**
 * One annotation drawn on the board between two real positions — "what the
 * player did while deciding this move" (peek / illegal attempt / undo).
 * Distinct from {@link RenderBoardSvgOverlay}: this is the frame-builder's
 * semantic vocabulary (`kind`), translated to the renderer's drawing
 * vocabulary (`badge` / `illegalTo` / `illegalFrom`) at the rasterization
 * boundary in `generate-game-gif.ts`.
 */
export type GifOverlay =
  { kind: 'peek' } | { kind: 'undo' } | { kind: 'illegal'; to?: string; from?: string };

export type GifFrame = {
  fen: string;
  lastMove: { from: string; to: string } | null;
  displaySettings: BlindfoldDisplaySettings | null;
  overlay?: GifOverlay;
  delayMs: number;
};

export type GameFrameSource = Pick<
  GameRecord,
  | 'moves'
  | 'startingFen'
  | 'setupPlies'
  | 'playerColor'
  | 'playSettings'
  | 'playSettingsLog'
  | 'operationLogs'
  | 'undoneLogs'
>;

type ReplayPosition = ReturnType<typeof replayMoves>[number];
/** A replayed position paired with its half-move index (0 = opening board). */
type IndexedPosition = { position: ReplayPosition; halfMoveIndex: number };

/**
 * Truncates to the leading `MAX_FRAMES - 1` positions plus the true final
 * position when a game runs long, same rule the GIF pipeline has always
 * used — playback never silently ends mid-game, it just skips the middle.
 * Keeps each surviving position's original half-move index, since that
 * index (not the position's offset in this possibly-discontiguous array) is
 * what both the blindfold-settings fold and the slot-adjacency check below
 * key off of.
 */
function selectRealFrames(positions: ReplayPosition[]): IndexedPosition[] {
  const indexed = positions.map((position, halfMoveIndex) => ({ position, halfMoveIndex }));
  if (indexed.length <= MAX_FRAMES) return indexed;
  return [...indexed.slice(0, MAX_FRAMES - 1), indexed[indexed.length - 1]];
}

function delayForRealFrame(indexInRetained: number, retainedCount: number): number {
  if (indexInRetained === retainedCount - 1) return DELAY_LAST_MS;
  if (indexInRetained === 0) return DELAY_FIRST_MS;
  return DELAY_MOVE_MS;
}

/**
 * Whether a set of per-move operation logs has anything this feature draws
 * (peek / undo / invalid-attempt). Deliberately excludes `movePeekCount`
 * (legal-move hints) — those stay undrawn in v1 since they don't change what
 * the board looks like. Used to gate whether a game's "played" GIF differs
 * from its "plain" one at all, alongside the existing playSettings-notability
 * check (a fully-sighted game can still have had a peek or a typo).
 */
export function hasAnnotatableOps(logs: MoveOperationLog[] | null | undefined): boolean {
  if (!logs) return false;
  return logs.some((log) => log.peekCount > 0 || log.undoCount > 0 || (log.invalidCount ?? 0) > 0);
}

/**
 * The blindfold display settings for a peek-reveal frame: the position's
 * normal as-played fold with `boardVisibility` forced to `'always'`, so a
 * whole-board hide lifts but per-piece obfuscation (Go stones, side hides,
 * pawn hides) stays exactly as the player had it set — a peek reveals the
 * real board, not a fully sighted one. Mirrors d222e0da7's peek-passthrough
 * rule. Returns null (plain board) when the game has no snapshot to reveal.
 */
function peekDisplaySettings(
  game: GameFrameSource,
  halfMoveIndex: number
): BlindfoldDisplaySettings | null {
  if (!game.playSettings) return null;
  const at = playSettingsAtHalfMove(game.playSettings, game.playSettingsLog, halfMoveIndex);
  const revealed: GamePlaySettings = { ...at, boardVisibility: 'always' };
  return foldPlaySettingsToDisplay(revealed, game.playerColor);
}

/**
 * Annotation frames for one player-move slot, in slot-grammar order (peek →
 * illegal attempts → the real move itself, the last of which the caller
 * appends separately).
 *
 * `beforePosition`/`beforeHalfMove` is `positions[m]` — the position the
 * player was looking at while deciding this move, which every annotation in
 * the slot renders against.
 */
function buildSlotAnnotations(
  game: GameFrameSource,
  beforePosition: ReplayPosition,
  beforeHalfMove: number,
  log: MoveOperationLog
): GifFrame[] {
  const frames: GifFrame[] = [];

  if (log.peekCount > 0) {
    frames.push({
      fen: beforePosition.fen,
      lastMove: beforePosition.lastMove ?? null,
      displaySettings: peekDisplaySettings(game, beforeHalfMove),
      overlay: { kind: 'peek' },
      delayMs: DELAY_PEEK_MS,
    });
  }

  // The player was looking at (and typing into) the hidden-as-usual board —
  // unlike the peek flash, an illegal attempt must NOT reveal it.
  const asPlayedDisplay = playSettingsDisplayAtHalfMove(
    game.playSettings,
    game.playSettingsLog,
    game.playerColor,
    beforeHalfMove
  );
  const illegalSquares = (log.invalidAttempts ?? [])
    .map((attempt) => parseAttemptSquares(attempt, game.playerColor))
    .filter((squares): squares is { from?: string; to?: string } => squares !== null)
    .slice(0, MAX_ILLEGAL_ATTEMPTS_DRAWN);

  for (const squares of illegalSquares) {
    frames.push({
      fen: beforePosition.fen,
      lastMove: beforePosition.lastMove ?? null,
      displaySettings: asPlayedDisplay,
      overlay: { kind: 'illegal', to: squares.to, from: squares.from },
      delayMs: DELAY_ILLEGAL_MS,
    });
    // "Snap back" — reinforces that the illegal attempt never happened, and
    // keeps the frame right before the real move from reading as "the red
    // move was the one actually played."
    frames.push({
      fen: beforePosition.fen,
      lastMove: beforePosition.lastMove ?? null,
      displaySettings: asPlayedDisplay,
      delayMs: DELAY_REVERT_MS,
    });
  }

  return frames;
}

/**
 * Builds the ordered, timed frame sequence for a published game's replay —
 * the pure core of GIF generation, kept separate from rasterization so the
 * frame sequence itself (which position, which annotation, how long) can be
 * asserted directly in tests without going through sharp/libvips.
 *
 * `'plain'` is unannotated: real positions only, no display-settings fold, no
 * overlays — byte-for-byte the same sequence the pipeline has always
 * produced, since its Storage cache key carries no version. `'played'` folds
 * blindfold display settings per frame (`playSettingsDisplayAtHalfMove`) and
 * inserts annotation frames between the real position a player move was
 * decided from and the move itself, for every player-move slot that has a
 * matching {@link MoveOperationLog}.
 *
 * An annotatable slot is one where both `positions[m]` (before the move) and
 * `positions[m+1]` (after) survived {@link selectRealFrames} truncation *and*
 * remained adjacent in the output — i.e. nothing was skipped between them.
 * Annotations are inserted front-to-back; once the running total would
 * exceed {@link MAX_FRAMES}, every remaining slot's annotations are skipped
 * (real positions are never sacrificed to make room).
 */
export function buildGameFrames(game: GameFrameSource, variant: GameGifVariant): GifFrame[] {
  const allPositions = replayMoves(game.moves, game.startingFen ?? undefined);
  const realFrames = selectRealFrames(allPositions);

  if (variant === 'plain') {
    return realFrames.map(({ position }, idx) => ({
      fen: position.fen,
      lastMove: position.lastMove ?? null,
      displaySettings: null,
      delayMs: delayForRealFrame(idx, realFrames.length),
    }));
  }

  const playerMoveIndices = getPlayerMoveIndices(
    game.moves.length,
    game.startingFen ?? undefined,
    game.playerColor,
    game.setupPlies ?? 0
  );
  const logByMovesIndex = new Map<number, MoveOperationLog>();
  playerMoveIndices.forEach((movesIndex, i) => {
    const log = game.operationLogs?.[i];
    if (log) logByMovesIndex.set(movesIndex, log);
  });

  const frames: GifFrame[] = [];
  let budgetExhausted = false;

  realFrames.forEach(({ position, halfMoveIndex }, idx) => {
    const slotMovesIndex = halfMoveIndex - 1;
    const slotIsAdjacent = idx > 0 && realFrames[idx - 1].halfMoveIndex === slotMovesIndex;
    const log = slotIsAdjacent ? logByMovesIndex.get(slotMovesIndex) : undefined;

    if (log && !budgetExhausted) {
      const annotations = buildSlotAnnotations(
        game,
        realFrames[idx - 1].position,
        slotMovesIndex,
        log
      );
      const remainingRealFrames = realFrames.length - idx;
      const remainingBudget = MAX_FRAMES - frames.length - remainingRealFrames;
      if (annotations.length <= remainingBudget) {
        frames.push(...annotations);
      } else {
        budgetExhausted = true;
      }
    }

    frames.push({
      fen: position.fen,
      lastMove: position.lastMove ?? null,
      displaySettings: playSettingsDisplayAtHalfMove(
        game.playSettings,
        game.playSettingsLog,
        game.playerColor,
        halfMoveIndex
      ),
      delayMs: delayForRealFrame(idx, realFrames.length),
    });
  });

  return frames;
}
