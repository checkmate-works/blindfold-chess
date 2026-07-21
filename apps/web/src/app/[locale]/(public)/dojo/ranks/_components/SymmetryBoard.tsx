'use client';

import { QuadrantGridBoard } from './QuadrantGridBoard';

const FILES = ['a', 'b', 'c', 'd'];
const RANKS = ['8', '7', '6', '5'];

// Highlighted squares: the 4 corners of the quadrant
const HIGHLIGHT_SQUARES = ['a8', 'd8', 'a5', 'd5'];

const svgOverlay = (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid meet"
  >
    <defs>
      <marker id="arrowhead-rose" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" className="fill-rose-500" />
      </marker>
      <marker id="arrowhead-blue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" className="fill-blue-500" />
      </marker>
      <marker
        id="arrowhead-emerald"
        markerWidth="8"
        markerHeight="6"
        refX="7"
        refY="3"
        orient="auto"
      >
        <polygon points="0 0, 8 3, 0 6" className="fill-emerald-500" />
      </marker>
    </defs>
    {/* Arrow from a8 (center of top-left square: 12.5, 12.5) to d5 (center of bottom-right square: 87.5, 87.5) */}
    {/* In a 4x4 grid, each square is 25%. Centers: col0=12.5, col1=37.5, col2=62.5, col3=87.5 */}
    <line
      x1="12.5"
      y1="12.5"
      x2="82"
      y2="82"
      stroke="currentColor"
      strokeWidth="2"
      className="text-rose-500"
      markerEnd="url(#arrowhead-rose)"
    />
    {/* Arrow from a8 to d8 (top-right) */}
    <line
      x1="12.5"
      y1="12.5"
      x2="82"
      y2="12.5"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-blue-500"
      markerEnd="url(#arrowhead-blue)"
      strokeDasharray="4 2"
    />
    {/* Arrow from a8 to a5 (bottom-left) */}
    <line
      x1="12.5"
      y1="12.5"
      x2="12.5"
      y2="82"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-emerald-500"
      markerEnd="url(#arrowhead-emerald)"
      strokeDasharray="4 2"
    />
  </svg>
);

export function SymmetryBoard() {
  return (
    <QuadrantGridBoard
      files={FILES}
      ranks={RANKS}
      fileOffset={0}
      rankOffset={0}
      highlightedSquares={HIGHLIGHT_SQUARES}
      svgOverlay={svgOverlay}
    />
  );
}
