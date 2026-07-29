'use client';

import { useEffect, useMemo, useState } from 'react';

import { FaPause, FaPlay } from 'react-icons/fa';

import { renderBoardSvg } from '@/lib/board-svg/render-board-svg';
import type { GifPreviewSource } from '@/lib/games/gif/preview-frames';
import { buildGamePreviewFrames } from '@/lib/games/gif/preview-frames';
import { toRenderOverlay } from '@/lib/games/gif/to-render-overlay';

type Props = GifPreviewSource & {
  /** Describes the animation for screen readers (the board itself is decorative). */
  label: string;
  playLabel: string;
  pauseLabel: string;
};

/**
 * Plays the opening seconds of the animated GIF a game *would* produce, before
 * that game is published.
 *
 * The real GIF can only be built server-side — `sharp` rasterizes the frames and
 * the route keys off a published DB row — so a not-yet-published game has no
 * file to show. What it does have is everything the frames are made of, sitting
 * in localStorage: `buildGameFrames` and `renderBoardSvg` are both pure and
 * run in the browser, and only the rasterize-and-encode step is Node-bound.
 * Driving those two directly gives a preview that is frame-for-frame the file
 * the player gets after publishing (see {@link buildGamePreviewFrames} for why
 * it stops early), instead of a stand-in sample of somebody else's game.
 *
 * The SVG is injected as markup because `renderBoardSvg` returns a string —
 * it is generated from a FEN and fixed palettes, with no user-supplied text
 * anywhere in it (the renderer emits no `<text>` at all).
 */
export function GameGifPreview({ source, variant, label, playLabel, pauseLabel }: Props) {
  const frames = useMemo(() => buildGamePreviewFrames(source, variant), [source, variant]);
  const flipped = source.playerColor === 'black';

  const [index, setIndex] = useState(0);
  // Auto-plays, except for viewers who asked not to be animated at — they get
  // the opening position and the play control. The loop runs longer than the
  // five seconds WCAG 2.2.2 lets an animation play unattended, so the control
  // is required regardless of that preference.
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = setTimeout(() => {
      setIndex((current) => (current + 1) % frames.length);
    }, frames[index].delayMs);
    return () => clearTimeout(timer);
  }, [playing, index, frames]);

  if (frames.length === 0) return null;

  const frame = frames[index];
  const svg = renderBoardSvg({
    fen: frame.fen,
    flipped,
    lastMove: frame.lastMove,
    displaySettings: frame.displaySettings,
    overlay: frame.overlay ? toRenderOverlay(frame.overlay) : null,
    terminationMark: frame.terminationMark ?? null,
  });

  return (
    <div className="relative mx-auto w-full max-w-[16rem]">
      <div
        role="img"
        aria-label={label}
        data-testid="gif-preview-board"
        data-frame-index={index}
        className="overflow-hidden rounded-md [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <button
        type="button"
        onClick={() => setPlaying((current) => !current)}
        aria-label={playing ? pauseLabel : playLabel}
        className="absolute right-2 bottom-2 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/75"
      >
        {playing ? (
          <FaPause className="h-3 w-3" aria-hidden />
        ) : (
          <FaPlay className="h-3 w-3" aria-hidden />
        )}
      </button>
    </div>
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
