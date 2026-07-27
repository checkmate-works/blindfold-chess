import { replayMoves } from '@blindfold-chess/features/chess-core';
import 'server-only';
import sharp from 'sharp';

import { renderBoardSvg } from '@/lib/board-svg/render-board-svg';
import type { GameRecord } from '@/lib/db/schema';
import type { GameGifVariant } from '@/lib/games/gif/constants';
import { playSettingsDisplayAtHalfMove } from '@/lib/games/play-settings-thumbnail';

export type { GameGifVariant } from '@/lib/games/gif/constants';

const BOARD_SIZE = 512;
/**
 * Hard cap on rendered frames (120 moves + the initial position). Longer
 * games are truncated to the leading `MAX_FRAMES - 1` positions plus the true
 * final position, so playback never silently ends mid-game — it just skips
 * the middle. Accepted per spec rather than rendering every position, since a
 * 120+ move blindfold game is rare and an unbounded GIF is a real memory /
 * response-time risk.
 */
const MAX_FRAMES = 241;
/** Frames rendered to PNG concurrently, to bound peak memory. */
const FRAME_RENDER_CONCURRENCY = 8;
const DELAY_FIRST_MS = 1000;
const DELAY_MOVE_MS = 800;
const DELAY_LAST_MS = 4000;

type ReplayPosition = ReturnType<typeof replayMoves>[number];

/**
 * A replayed position paired with its half-move index (moves already played
 * at that position — 0 for the opening board). Preserved through truncation
 * so `'played'` can fold blindfold display settings at the right point in
 * `playSettingsLog` even for the true final position of a truncated game,
 * which does not sit at its "natural" array offset once the middle is
 * skipped.
 */
type IndexedPosition = { position: ReplayPosition; halfMoveIndex: number };

function selectFrames(positions: ReplayPosition[]): IndexedPosition[] {
  const indexed = positions.map((position, halfMoveIndex) => ({ position, halfMoveIndex }));
  if (indexed.length <= MAX_FRAMES) return indexed;
  return [...indexed.slice(0, MAX_FRAMES - 1), indexed[indexed.length - 1]];
}

function delaysFor(frameCount: number): number[] {
  return Array.from({ length: frameCount }, (_, i) => {
    if (i === frameCount - 1) return DELAY_LAST_MS;
    if (i === 0) return DELAY_FIRST_MS;
    return DELAY_MOVE_MS;
  });
}

async function renderFramesToPng(
  frames: IndexedPosition[],
  opts: { flipped: boolean; game: GameRecord; variant: GameGifVariant }
): Promise<Buffer[]> {
  const buffers: Buffer[] = new Array(frames.length);
  for (let i = 0; i < frames.length; i += FRAME_RENDER_CONCURRENCY) {
    const chunk = frames.slice(i, i + FRAME_RENDER_CONCURRENCY);
    const rendered = await Promise.all(
      chunk.map(({ position, halfMoveIndex }) => {
        const displaySettings =
          opts.variant === 'played'
            ? playSettingsDisplayAtHalfMove(
                opts.game.playSettings,
                opts.game.playSettingsLog,
                opts.game.playerColor,
                halfMoveIndex
              )
            : null;
        const svg = renderBoardSvg({
          fen: position.fen,
          size: BOARD_SIZE,
          flipped: opts.flipped,
          lastMove: position.lastMove ?? null,
          displaySettings,
        });
        return sharp(Buffer.from(svg)).png().toBuffer();
      })
    );
    rendered.forEach((buf, j) => {
      buffers[i + j] = buf;
    });
  }
  return buffers;
}

/**
 * Render a published game's replay as an animated GIF — the frame source
 * shared with {@link renderBoardSvg} (Phase 1's OG image). `'played'` renders
 * the blindfold "as played" board (ghosts / Go stones) via
 * {@link playSettingsDisplayAtHalfMove}, folded independently per frame so a
 * game whose visibility changed mid-game (revealed or hidden partway through)
 * shows what the player actually saw at each position, not just the
 * start-of-game snapshot; games with no notable play settings render
 * identically for both variants.
 */
export async function generateGameGif(game: GameRecord, variant: GameGifVariant): Promise<Buffer> {
  const allPositions = replayMoves(game.moves, game.startingFen ?? undefined);
  const frames = selectFrames(allPositions);

  const flipped = game.playerColor === 'black';

  const pngBuffers = await renderFramesToPng(frames, { flipped, game, variant });
  const delays = delaysFor(pngBuffers.length);

  return sharp(pngBuffers, { join: { animated: true } })
    .gif({ delay: delays, loop: 0, effort: 7 })
    .toBuffer();
}
