import { QuadrantGridBoard } from './QuadrantGridBoard';

type Quadrant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const QUADRANT_CONFIG: Record<
  Quadrant,
  { files: string[]; ranks: string[]; fileOffset: number; rankOffset: number }
> = {
  'top-left': {
    files: ['a', 'b', 'c', 'd'],
    ranks: ['8', '7', '6', '5'],
    fileOffset: 0,
    rankOffset: 0,
  },
  'top-right': {
    files: ['e', 'f', 'g', 'h'],
    ranks: ['8', '7', '6', '5'],
    fileOffset: 4,
    rankOffset: 0,
  },
  'bottom-left': {
    files: ['a', 'b', 'c', 'd'],
    ranks: ['4', '3', '2', '1'],
    fileOffset: 0,
    rankOffset: 4,
  },
  'bottom-right': {
    files: ['e', 'f', 'g', 'h'],
    ranks: ['4', '3', '2', '1'],
    fileOffset: 4,
    rankOffset: 4,
  },
};

type MiniBoardProps = {
  highlightedSquares?: string[];
  quadrant?: Quadrant;
};

export function MiniBoard({ highlightedSquares = [], quadrant = 'top-left' }: MiniBoardProps) {
  const config = QUADRANT_CONFIG[quadrant];

  return (
    <QuadrantGridBoard
      files={config.files}
      ranks={config.ranks}
      fileOffset={config.fileOffset}
      rankOffset={config.rankOffset}
      highlightedSquares={highlightedSquares}
    />
  );
}
