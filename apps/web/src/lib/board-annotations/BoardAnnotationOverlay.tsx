import { getSquareVisualCell } from '@/app/_components/chess/board-coords';

import type { AnnotationColor, Arrow, BoardAnnotations, Circle } from './types';

const SVG_SIZE = 80; // 10 units per square
const SQ = 10;

const ARROW_LINE_WIDTH = 1.4;
const ARROW_HEAD_LEN = 3.6;
const ARROW_HEAD_HALF_WIDTH = 2.2;
const ARROW_START_OFFSET = 1.0; // pull start out of source square center toward target

const CIRCLE_RADIUS = 4.5;
const CIRCLE_STROKE_WIDTH = 0.8;

const COLOR_HEX: Record<AnnotationColor, string> = {
  green: '#15781b',
  red: '#882020',
  yellow: '#e68f00',
  blue: '#003088',
};

const ARROW_OPACITY = 0.85;
const CIRCLE_OPACITY = 0.9;

function squareCenter(square: string, flipped: boolean): { cx: number; cy: number } {
  const { col, row } = getSquareVisualCell(square, flipped);
  return { cx: col * SQ + SQ / 2, cy: row * SQ + SQ / 2 };
}

function arrowPath(arrow: Arrow, flipped: boolean): string | null {
  const start = squareCenter(arrow.from, flipped);
  const end = squareCenter(arrow.to, flipped);
  const dx = end.cx - start.cx;
  const dy = end.cy - start.cy;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;
  const ux = dx / len;
  const uy = dy / len;
  // perpendicular (rotated 90° CCW)
  const px = -uy;
  const py = ux;

  const sx = start.cx + ux * ARROW_START_OFFSET;
  const sy = start.cy + uy * ARROW_START_OFFSET;
  const tipX = end.cx;
  const tipY = end.cy;
  const baseX = tipX - ux * ARROW_HEAD_LEN;
  const baseY = tipY - uy * ARROW_HEAD_LEN;
  const leftX = baseX + px * ARROW_HEAD_HALF_WIDTH;
  const leftY = baseY + py * ARROW_HEAD_HALF_WIDTH;
  const rightX = baseX - px * ARROW_HEAD_HALF_WIDTH;
  const rightY = baseY - py * ARROW_HEAD_HALF_WIDTH;

  // Line from start to head base, then triangle to tip
  return `M ${sx} ${sy} L ${baseX} ${baseY} L ${leftX} ${leftY} L ${tipX} ${tipY} L ${rightX} ${rightY} L ${baseX} ${baseY} Z`;
}

function ArrowShape({ arrow, flipped }: { arrow: Arrow; flipped: boolean }) {
  const d = arrowPath(arrow, flipped);
  if (!d) return null;
  const color = COLOR_HEX[arrow.color];
  return (
    <path
      d={d}
      fill={color}
      stroke={color}
      strokeWidth={ARROW_LINE_WIDTH}
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity={ARROW_OPACITY}
    />
  );
}

function CircleShape({ circle, flipped }: { circle: Circle; flipped: boolean }) {
  const { cx, cy } = squareCenter(circle.square, flipped);
  const color = COLOR_HEX[circle.color];
  return (
    <circle
      cx={cx}
      cy={cy}
      r={CIRCLE_RADIUS}
      fill="none"
      stroke={color}
      strokeWidth={CIRCLE_STROKE_WIDTH}
      opacity={CIRCLE_OPACITY}
    />
  );
}

type Props = {
  annotations: BoardAnnotations;
  flipped?: boolean;
};

/**
 * Pure SVG overlay that draws arrows and circles on top of a chess board.
 * Renders as a Server Component (no `'use client'`, no hooks, no state).
 *
 * Must be placed inside a `position: relative` parent that contains the
 * board itself; the overlay is absolutely positioned to fill that parent
 * and `pointer-events: none` so it never blocks board interactions.
 *
 * The viewBox is 8x8 squares scaled to 80 units (10 per square) so that
 * arrow/circle stroke widths are clean fractions of a square.
 *
 * @param annotations.arrows Arrows to draw. Skipped if `from === to`.
 * @param annotations.circles Circles to draw on each named square.
 * @param flipped When true, the board is drawn from Black's perspective.
 *   The overlay flips its mapping accordingly so square names like `e4`
 *   land on the correct visual cell.
 */
export function BoardAnnotationOverlay({ annotations, flipped = false }: Props) {
  const { arrows, circles } = annotations;
  if (arrows.length === 0 && circles.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {arrows.map((arrow, i) => (
        <ArrowShape key={`a-${i}`} arrow={arrow} flipped={flipped} />
      ))}
      {circles.map((circle, i) => (
        <CircleShape key={`c-${i}`} circle={circle} flipped={flipped} />
      ))}
    </svg>
  );
}
