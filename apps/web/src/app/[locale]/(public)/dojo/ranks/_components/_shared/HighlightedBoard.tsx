'use client';

import type { ReactNode } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import {
  BOARD_FRAME_EXPAND_ON_MOBILE_CLASS,
  BOARD_RADIUS_EXPAND_ON_MOBILE,
} from '@/app/_components/chess/BoardFrame';

import { useBoardTheme } from '../useBoardTheme';

/**
 * Coordinate of a single square on the SVG overlay (0..100 viewBox space).
 * Each square is 12.5 x 12.5 in this coordinate system.
 */
type SquareCoord = { x: number; y: number };

/**
 * Endpoints of an arrow line on the SVG overlay (0..100 viewBox space).
 */
type LineEndpoints = { x1: number; y1: number; x2: number; y2: number };

type RectOverlay = {
  kind: 'rect';
  /** Squares to fill, in 12.5-unit SVG coordinates */
  squares: SquareCoord[];
  fill: string;
  opacity?: number;
  /**
   * Optional Tailwind `text-...` class applied to a wrapping `<g>`. When
   * set, the rects fill with `currentColor`, so they inherit this class's
   * color. Used by Diagonal/AntiDiagonal full-line boards which fill via
   * `text-emerald-500` and `fill="currentColor"`.
   */
  currentColorClass?: string;
};

type LineOverlay = {
  kind: 'line';
  lines: LineEndpoints[];
  stroke: string;
  strokeWidth?: number;
  opacity?: number;
  /** ID of an SVG <marker> element to apply as marker-end. */
  markerEndId?: string;
};

export type Overlay = RectOverlay | LineOverlay;

/**
 * These aids sit in prose (`/dojo/guides`, the rank Tips card, learn/manual
 * articles), where the board is the explanation — so it gets the same
 * full-bleed-on-mobile frame every other board in the app has. A caller may
 * still replace it: the Tips card passes `mx-auto max-w-[10rem]` for a
 * thumbnail.
 */
const DEFAULT_CLASS_NAME = BOARD_FRAME_EXPAND_ON_MOBILE_CLASS;

type HighlightedBoardProps = {
  overlays: Overlay[];
  /** Forwarded to BoardLayout; defaults to `() => null` (empty squares). */
  renderSquare?: (info: SquareRenderInfo) => ReactNode;
  /** Optional <defs> content (e.g. <marker> definitions for arrows). */
  defs?: ReactNode;
  className?: string;
};

const NO_RENDER = () => null;

/**
 * Renders a chess board with one or more SVG overlays drawn on top.
 *
 * Used as a primitive for ranks-guide board illustrations that need to
 * highlight specific squares (rect overlays) and/or draw arrows
 * (line overlays) over the board.
 */
export function HighlightedBoard({
  overlays,
  renderSquare = NO_RENDER,
  defs,
  className,
}: HighlightedBoardProps) {
  const { themeColors, showCoordinates, isLoaded } = useBoardTheme();
  const wrapperClass = className ?? DEFAULT_CLASS_NAME;

  if (!isLoaded) {
    return (
      <div className={wrapperClass}>
        <BoardSkeleton rounded={BOARD_RADIUS_EXPAND_ON_MOBILE} />
      </div>
    );
  }

  return (
    <div className={`relative ${wrapperClass}`}>
      <BoardLayout
        themeColors={themeColors}
        showCoordinates={showCoordinates}
        renderSquare={renderSquare}
        rounded={BOARD_RADIUS_EXPAND_ON_MOBILE}
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {defs ? <defs>{defs}</defs> : null}
        {overlays.map((overlay, idx) => (
          <OverlayLayer key={idx} overlay={overlay} />
        ))}
      </svg>
    </div>
  );
}

function OverlayLayer({ overlay }: { overlay: Overlay }) {
  if (overlay.kind === 'rect') {
    const rects = overlay.squares.map((sq, i) => (
      <rect
        key={i}
        x={sq.x}
        y={sq.y}
        width={12.5}
        height={12.5}
        fill={overlay.currentColorClass ? 'currentColor' : overlay.fill}
        opacity={overlay.opacity ?? 1}
      />
    ));

    if (overlay.currentColorClass) {
      return <g className={overlay.currentColorClass}>{rects}</g>;
    }

    return <>{rects}</>;
  }

  const { lines, stroke, strokeWidth = 1.2, opacity = 0.7, markerEndId } = overlay;
  return (
    <>
      {lines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={opacity}
          markerEnd={markerEndId ? `url(#${markerEndId})` : undefined}
        />
      ))}
    </>
  );
}
