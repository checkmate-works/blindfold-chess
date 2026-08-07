import { QuadrantGridBoard } from './QuadrantGridBoard';

const FILES = ['e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5'];

const svgOverlay = (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid meet"
  >
    <defs>
      <marker id="step3-arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" className="fill-rose-500" />
      </marker>
    </defs>
    {/* e5 center: (12.5, 87.5), f6 center: (37.5, 62.5) */}
    <line
      x1="12.5"
      y1="87.5"
      x2="32"
      y2="68"
      stroke="currentColor"
      strokeWidth="2"
      className="text-rose-500"
      markerEnd="url(#step3-arrowhead)"
    />
  </svg>
);

export function Step3Board() {
  return (
    <QuadrantGridBoard
      files={FILES}
      ranks={RANKS}
      fileOffset={4}
      rankOffset={0}
      highlightedSquares={['e5']}
      svgOverlay={svgOverlay}
    />
  );
}
