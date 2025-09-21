export type GamePhase = 'memorize' | 'recreate' | 'result';

export interface ScoreDetail {
  square: string;
  expected: string;
  actual: string;
  score: number;
  description: string;
}

export interface PositionAccuracy {
  correctPieces: number;
  totalPieces: number;
  extraPieces: number;
  netScore: number;
  accuracy: number;
  details: ScoreDetail[];
}

export interface PositionData {
  fen: string;
  isBlackToMove: boolean;
}

// FEN positions for practice - from simple to complex
const FEN_STRINGS = [
  '4k3/8/8/8/8/8/4p3/K7 w - - 0 1',
  '8/8/6q1/7q/5K2/8/4k3/8 b - - 3 77',
  '8/3R4/8/8/2k2Q2/P7/8/7K b - - 4 49',
  '8/3P4/7k/5pp1/8/4P1KP/5P2/8 b - - 0 53',
  '8/7p/4p1p1/8/p2P1Pk1/PbK5/7B/8 w - - 0 49',
  '1R6/P4ppk/4p2p/3pP3/1P6/5P1P/2r2r2/R4K2 w - - 6 36',
  '5k2/5ppp/p1p3n1/3pPp2/Q7/P6P/1r4q1/R3R2K w - - 0 25',
  '8/p4ppk/6qp/8/5P1n/P3P2Q/6rP/1R2R2K b - - 1 32',
  '2Q5/1B1k3p/3P2p1/4Pp2/5P2/1b6/5P1P/6K1 b - - 0 38',
  'r1bqk1nr/ppp1bppp/2n5/1P2P3/2Pp4/P4N2/3BPPPP/RN1QKB1R b KQkq - 0 8',
];

// Parse FEN positions
const PRACTICE_POSITIONS: PositionData[] = FEN_STRINGS.map((fen) => {
  const parts = fen.split(' ');
  const isBlackToMove = parts[1] === 'b';
  return { fen, isBlackToMove };
});

export function getRandomPosition(): PositionData {
  return PRACTICE_POSITIONS[Math.floor(Math.random() * PRACTICE_POSITIONS.length)];
}

export function getMaxProblems(): number {
  return PRACTICE_POSITIONS.length;
}

export function getRandomPositions(count: number, shuffle: boolean = true): PositionData[] {
  const positions = [...PRACTICE_POSITIONS];

  if (shuffle) {
    // Fisher-Yates shuffle algorithm
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
  }

  return positions.slice(0, Math.min(count, positions.length));
}

export function getCustomPositions(
  fenStrings: string[],
  count: number,
  shuffle: boolean = true
): PositionData[] {
  const positions = fenStrings.map((fen) => {
    const parts = fen.trim().split(' ');
    const isBlackToMove = parts[1] === 'b';
    return { fen: fen.trim(), isBlackToMove };
  });

  if (shuffle) {
    // Fisher-Yates shuffle algorithm
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
  }

  return positions.slice(0, Math.min(count, positions.length));
}

export function validateFEN(fen: string): boolean {
  const parts = fen.trim().split(' ');

  // FEN must have at least 2 parts (board and turn)
  if (parts.length < 2) return false;

  // Validate board part (8 ranks separated by /)
  const board = parts[0];
  const ranks = board.split('/');
  if (ranks.length !== 8) return false;

  // Validate each rank
  for (const rank of ranks) {
    let squareCount = 0;
    for (const char of rank) {
      if (/[1-8]/.test(char)) {
        squareCount += parseInt(char);
      } else if (/[pnbrqkPNBRQK]/.test(char)) {
        squareCount += 1;
      } else {
        return false;
      }
    }
    if (squareCount !== 8) return false;
  }

  // Validate turn
  if (parts[1] !== 'w' && parts[1] !== 'b') return false;

  return true;
}

// Helper function to convert square index to algebraic notation
function indexToSquare(index: number): string {
  const file = String.fromCharCode(97 + (index % 8)); // a-h
  const rank = 8 - Math.floor(index / 8); // 8-1
  return file + rank;
}

// Helper function to get piece description
function getPieceDescription(piece: string, pieceNames: Record<string, string>): string {
  return pieceNames[piece] || piece;
}

export function calculateAccuracy(
  originalFen: string,
  recreatedFen: string,
  pieceNames: Record<string, string>,
  descriptions: {
    correct: (piece: string, square: string) => string;
    wrongPiece: (square: string, expected: string, actual: string) => string;
    missing: (piece: string, square: string) => string;
    extra: (piece: string, square: string) => string;
  }
): PositionAccuracy {
  // Extract piece placement part from FEN (before first space)
  const originalPieces = originalFen.split(' ')[0];
  const recreatedPieces = recreatedFen.split(' ')[0];

  // Convert FEN board representation to array of squares
  const originalBoard = fenToBoard(originalPieces);
  const recreatedBoard = fenToBoard(recreatedPieces);

  let correctPieces = 0;
  let totalPieces = 0;
  let extraPieces = 0;
  const details: ScoreDetail[] = [];

  for (let i = 0; i < 64; i++) {
    const originalPiece = originalBoard[i];
    const recreatedPiece = recreatedBoard[i];
    const square = indexToSquare(i);

    if (originalPiece !== '' && recreatedPiece !== '') {
      // Both squares have pieces
      totalPieces++;
      if (originalPiece === recreatedPiece) {
        // Correct piece
        correctPieces++;
        details.push({
          square,
          expected: originalPiece,
          actual: recreatedPiece,
          score: 1,
          description: descriptions.correct(getPieceDescription(originalPiece, pieceNames), square),
        });
      } else {
        // Wrong piece
        details.push({
          square,
          expected: originalPiece,
          actual: recreatedPiece,
          score: -0.5,
          description: descriptions.wrongPiece(
            square,
            getPieceDescription(originalPiece, pieceNames),
            getPieceDescription(recreatedPiece, pieceNames)
          ),
        });
        extraPieces++;
      }
    } else if (originalPiece !== '' && recreatedPiece === '') {
      // Missing piece
      totalPieces++;
      details.push({
        square,
        expected: originalPiece,
        actual: '',
        score: 0,
        description: descriptions.missing(getPieceDescription(originalPiece, pieceNames), square),
      });
    } else if (originalPiece === '' && recreatedPiece !== '') {
      // Extra piece
      extraPieces++;
      details.push({
        square,
        expected: '',
        actual: recreatedPiece,
        score: -0.5,
        description: descriptions.extra(getPieceDescription(recreatedPiece, pieceNames), square),
      });
    }
    // If both are empty, no action needed
  }

  const netScore = correctPieces - extraPieces * 0.5;
  const accuracy = totalPieces > 0 ? Math.max(0, (netScore / totalPieces) * 100) : 0;

  return {
    correctPieces,
    totalPieces,
    extraPieces,
    netScore,
    accuracy,
    details,
  };
}

function fenToBoard(fenPieces: string): string[] {
  const board: string[] = new Array(64).fill('');
  let squareIndex = 0;

  for (const char of fenPieces) {
    if (char === '/') {
      // Skip rank separator
      continue;
    } else if (/\d/.test(char)) {
      // Empty squares
      const emptySquares = parseInt(char);
      squareIndex += emptySquares;
    } else {
      // Piece
      board[squareIndex] = char;
      squareIndex++;
    }
  }

  return board;
}
