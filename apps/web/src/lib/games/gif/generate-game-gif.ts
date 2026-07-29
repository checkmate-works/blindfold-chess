import 'server-only';
import sharp from 'sharp';

import { renderBoardSvg } from '@/lib/board-svg/render-board-svg';
import type { GameRecord } from '@/lib/db/schema';
import type { GifFrame } from '@/lib/games/gif/build-game-frames';
import { buildGameFrames } from '@/lib/games/gif/build-game-frames';
import type { GameGifVariant } from '@/lib/games/gif/constants';
import { toRenderOverlay } from '@/lib/games/gif/to-render-overlay';

export type { GameGifVariant } from '@/lib/games/gif/constants';

const BOARD_SIZE = 512;
/** Frames rendered to PNG concurrently, to bound peak memory. */
const FRAME_RENDER_CONCURRENCY = 8;

async function renderFramesToPng(frames: GifFrame[], flipped: boolean): Promise<Buffer[]> {
  const buffers: Buffer[] = new Array(frames.length);
  for (let i = 0; i < frames.length; i += FRAME_RENDER_CONCURRENCY) {
    const chunk = frames.slice(i, i + FRAME_RENDER_CONCURRENCY);
    const rendered = await Promise.all(
      chunk.map((frame) => {
        const svg = renderBoardSvg({
          fen: frame.fen,
          size: BOARD_SIZE,
          flipped,
          lastMove: frame.lastMove,
          displaySettings: frame.displaySettings,
          overlay: frame.overlay ? toRenderOverlay(frame.overlay) : null,
          terminationMark: frame.terminationMark ?? null,
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
 * Render a published game's replay as an animated GIF. The frame sequence
 * itself — which position, which annotation overlay, how long each shows —
 * comes from {@link buildGameFrames}; this function only rasterizes that
 * sequence and joins it into a GIF. See `build-game-frames.ts` for what
 * `'plain'` vs `'played'` actually render.
 */
export async function generateGameGif(game: GameRecord, variant: GameGifVariant): Promise<Buffer> {
  const frames = buildGameFrames(game, variant);
  const flipped = game.playerColor === 'black';

  const pngBuffers = await renderFramesToPng(frames, flipped);
  const delays = frames.map((frame) => frame.delayMs);

  return sharp(pngBuffers, { join: { animated: true } })
    .gif({ delay: delays, loop: 0, effort: 7 })
    .toBuffer();
}
