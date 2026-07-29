import type { RenderBoardSvgOverlay } from '@/lib/board-svg/render-board-svg';
import type { GifOverlay } from '@/lib/games/gif/build-game-frames';

/**
 * Translates the frame builder's semantic overlay to the renderer's drawing
 * vocabulary.
 *
 * Its own module (rather than a private helper of `generate-game-gif.ts`)
 * because that file is `server-only`: the pre-publish preview draws the very
 * same frames in the browser, and both paths must translate overlays
 * identically or the preview would promise a GIF that differs from the one the
 * download produces.
 */
export function toRenderOverlay(overlay: GifOverlay): RenderBoardSvgOverlay {
  switch (overlay.kind) {
    case 'peek':
      return { badge: 'peek' };
    case 'undo':
      return { badge: 'undo' };
    case 'illegal':
      return { illegalTo: overlay.to, illegalFrom: overlay.from };
  }
}
