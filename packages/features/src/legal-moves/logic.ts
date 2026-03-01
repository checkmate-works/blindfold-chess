import { isLegalPieceMove } from "../chess-core";

import { FILES, RANKS } from "../common";

import type { MoveQuestion, PieceType } from "./types";

// Check if a move is legal for a given piece
export function isLegalMove(
  from: string,
  to: string,
  pieceType: PieceType,
): boolean {
  return isLegalPieceMove(from, to, pieceType);
}

// Get a mix of legal and illegal moves for better distribution
export function generateBalancedMoveQuestions(
  count: number,
  allowedPieces: PieceType[] = ["b", "n", "r", "q", "k"],
): MoveQuestion[] {
  const questions: MoveQuestion[] = [];
  const targetLegalCount = Math.floor(count * 0.5); // Aim for 50% legal moves
  let legalCount = 0;

  while (questions.length < count) {
    const piece =
      allowedPieces[Math.floor(Math.random() * allowedPieces.length)];
    const question = generateMoveQuestionForPiece(
      piece,
      legalCount < targetLegalCount,
    );

    if (question) {
      questions.push(question);
      if (isLegalMove(question.from, question.to, question.piece)) {
        legalCount++;
      }
    }
  }

  // Shuffle the questions
  return questions.sort(() => Math.random() - 0.5);
}

// Strategy interface for piece move generation
interface PieceMoveStrategy {
  generateCandidateMove(
    fromFile: number,
    fromRank: number,
  ): { toFile: number; toRank: number };
}

// Concrete Strategies
const BishopMoveStrategy: PieceMoveStrategy = {
  generateCandidateMove(fromFile, fromRank) {
    const diagonalOffset = Math.floor(Math.random() * 7) + 1;
    const direction = Math.floor(Math.random() * 4);
    switch (direction) {
      case 0:
        return {
          toFile: fromFile + diagonalOffset,
          toRank: fromRank + diagonalOffset,
        }; // up-right
      case 1:
        return {
          toFile: fromFile - diagonalOffset,
          toRank: fromRank + diagonalOffset,
        }; // up-left
      case 2:
        return {
          toFile: fromFile + diagonalOffset,
          toRank: fromRank - diagonalOffset,
        }; // down-right
      default:
        return {
          toFile: fromFile - diagonalOffset,
          toRank: fromRank - diagonalOffset,
        }; // down-left
    }
  },
};

const RookMoveStrategy: PieceMoveStrategy = {
  generateCandidateMove(fromFile, fromRank) {
    if (Math.random() < 0.5) {
      return { toFile: Math.floor(Math.random() * 8), toRank: fromRank }; // Horizontal
    } else {
      return { toFile: fromFile, toRank: Math.floor(Math.random() * 8) }; // Vertical
    }
  },
};

const KnightMoveStrategy: PieceMoveStrategy = {
  generateCandidateMove(fromFile, fromRank) {
    const knightMoves = [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ];
    const move = knightMoves[Math.floor(Math.random() * knightMoves.length)];
    return { toFile: fromFile + move[0], toRank: fromRank + move[1] };
  },
};

const QueenMoveStrategy: PieceMoveStrategy = {
  generateCandidateMove(fromFile, fromRank) {
    if (Math.random() < 0.5) {
      return BishopMoveStrategy.generateCandidateMove(fromFile, fromRank);
    } else {
      return RookMoveStrategy.generateCandidateMove(fromFile, fromRank);
    }
  },
};

const KingMoveStrategy: PieceMoveStrategy = {
  generateCandidateMove(fromFile, fromRank) {
    const kingMoves = [
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
    ];
    const move = kingMoves[Math.floor(Math.random() * kingMoves.length)];
    return { toFile: fromFile + move[0], toRank: fromRank + move[1] };
  },
};

// Strategy map
const PieceStrategies: Record<PieceType, PieceMoveStrategy> = {
  b: BishopMoveStrategy,
  n: KnightMoveStrategy,
  r: RookMoveStrategy,
  q: QueenMoveStrategy,
  k: KingMoveStrategy,
};

// Generate a move question for a specific piece type
export function generateMoveQuestionForPiece(
  pieceType: PieceType,
  preferLegal: boolean,
): MoveQuestion | null {
  // Try multiple times to generate a suitable question
  for (let attempts = 0; attempts < 50; attempts++) {
    const fromFile = Math.floor(Math.random() * 8);
    const fromRank = Math.floor(Math.random() * 8);
    const fromSquare = FILES[fromFile] + RANKS[fromRank];

    let toFile: number;
    let toRank: number;

    if (preferLegal) {
      const strategy = PieceStrategies[pieceType];
      if (strategy) {
        const move = strategy.generateCandidateMove(fromFile, fromRank);
        toFile = move.toFile;
        toRank = move.toRank;
      } else {
        toFile = Math.floor(Math.random() * 8);
        toRank = Math.floor(Math.random() * 8);
      }
    } else {
      // Generate random moves (likely illegal)
      toFile = Math.floor(Math.random() * 8);
      toRank = Math.floor(Math.random() * 8);
    }

    // Check if destination is valid
    if (toFile >= 0 && toFile < 8 && toRank >= 0 && toRank < 8) {
      const toSquare = FILES[toFile] + RANKS[toRank];

      // Ensure from and to are different
      if (toSquare !== fromSquare) {
        const isLegal = isLegalMove(fromSquare, toSquare, pieceType);

        // Return if we got what we wanted
        if ((preferLegal && isLegal) || (!preferLegal && !isLegal)) {
          return {
            from: fromSquare,
            to: toSquare,
            piece: pieceType,
          };
        }
      }
    }
  }

  // Fallback: return any valid question
  const fromFile = Math.floor(Math.random() * 8);
  const fromRank = Math.floor(Math.random() * 8);
  const fromSquare = FILES[fromFile] + RANKS[fromRank];

  let toFile = Math.floor(Math.random() * 8);
  let toRank = Math.floor(Math.random() * 8);
  let toSquare = FILES[toFile] + RANKS[toRank];

  while (toSquare === fromSquare) {
    toFile = Math.floor(Math.random() * 8);
    toRank = Math.floor(Math.random() * 8);
    toSquare = FILES[toFile] + RANKS[toRank];
  }

  return {
    from: fromSquare,
    to: toSquare,
    piece: pieceType,
  };
}
