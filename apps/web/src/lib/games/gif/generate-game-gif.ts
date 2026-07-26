import type { BlindfoldDisplaySettings } from '@blindfold-chess/features/board-display';
import { replayMoves } from '@blindfold-chess/features/chess-core';
import 'server-only';
import sharp from 'sharp';

import { renderBoardSvg } from '@/lib/board-svg/render-board-svg';
import type { GameRecord } from '@/lib/db/schema';
import { playSettingsToThumbnailDisplay } from '@/lib/games/play-settings-thumbnail';

export type GameGifVariant = 'plain' | 'played';

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

function selectFrames(positions: ReplayPosition[]): ReplayPosition[] {
  if (positions.length <= MAX_FRAMES) return positions;
  return [...positions.slice(0, MAX_FRAMES - 1), positions[positions.length - 1]];
}

function delaysFor(frameCount: number): number[] {
  return Array.from({ length: frameCount }, (_, i) => {
    if (i === frameCount - 1) return DELAY_LAST_MS;
    if (i === 0) return DELAY_FIRST_MS;
    return DELAY_MOVE_MS;
  });
}

async function renderFramesToPng(
  positions: ReplayPosition[],
  opts: { flipped: boolean; displaySettings: BlindfoldDisplaySettings | null }
): Promise<Buffer[]> {
  const buffers: Buffer[] = new Array(positions.length);
  for (let i = 0; i < positions.length; i += FRAME_RENDER_CONCURRENCY) {
    const chunk = positions.slice(i, i + FRAME_RENDER_CONCURRENCY);
    const rendered = await Promise.all(
      chunk.map((position) => {
        const svg = renderBoardSvg({
          fen: position.fen,
          size: BOARD_SIZE,
          flipped: opts.flipped,
          lastMove: position.lastMove ?? null,
          displaySettings: opts.displaySettings,
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
 * {@link playSettingsToThumbnailDisplay}; games with no notable play settings
 * render identically for both variants.
 */
export async function generateGameGif(game: GameRecord, variant: GameGifVariant): Promise<Buffer> {
  const allPositions = replayMoves(game.moves, game.startingFen ?? undefined);
  const positions = selectFrames(allPositions);

  const displaySettings =
    variant === 'played'
      ? playSettingsToThumbnailDisplay(game.playSettings, game.playerColor)
      : null;
  const flipped = game.playerColor === 'black';

  const pngBuffers = await renderFramesToPng(positions, { flipped, displaySettings });
  const delays = delaysFor(pngBuffers.length);

  return sharp(pngBuffers, { join: { animated: true } })
    .gif({ delay: delays, loop: 0, effort: 7 })
    .toBuffer();
}
