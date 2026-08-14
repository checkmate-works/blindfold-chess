import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

/**
 * Type for preset FEN positions
 */
export type PresetPosition = {
  id: string;
  fen: string;
  title: string;
};

/**
 * FEN problems for FEN reconstruction training
 * Sourced from position-memory module - from simple to complex
 */
const FEN_PROBLEMS = [
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    name: 'Starting Position',
    nameJa: '初期配置',
  },
  {
    fen: '4k3/8/8/8/8/8/4p3/K7 w - - 0 1',
    name: 'Minimal Position',
    nameJa: '最小構成',
  },
  {
    fen: '8/3R4/8/8/2k2Q2/P7/8/7K b - - 4 49',
    name: 'Few Pieces',
    nameJa: '少数駒',
  },
  {
    fen: '1R6/P4ppk/4p2p/3pP3/1P6/5P1P/2r2r2/R4K2 w - - 6 36',
    name: 'Medium Complexity',
    nameJa: '中程度の複雑さ',
  },
  {
    fen: 'r1bqk1nr/ppp1bppp/2n5/1P2P3/2Pp4/P4N2/3BPPPP/RN1QKB1R b KQkq - 0 8',
    name: 'Higher Complexity',
    nameJa: '高難易度',
  },
];

/**
 * Get positions as PositionData array
 */
export function getFenPositions() {
  return FEN_PROBLEMS.map((problem) => {
    return {
      fen: problem.fen,
      isBlackToMove: isBlackToMoveFromFen(problem.fen),
      name: problem.name,
      nameJa: problem.nameJa,
    };
  });
}
