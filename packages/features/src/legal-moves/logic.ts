import { isLegalPieceMove } from "../chess-core";

import {
  type RandomSource,
  FILES,
  KING_OFFSETS,
  KNIGHT_OFFSETS,
  RANKS,
  shuffleArray,
} from "../common";
import { BOARD_SIZE } from "../common/constants";

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
  rng: RandomSource = Math.random,
): MoveQuestion[] {
  const questions: MoveQuestion[] = [];
  const targetLegalCount = Math.floor(count * 0.5); // Aim for 50% legal moves
  let legalCount = 0;

  while (questions.length < count) {
    const piece = allowedPieces[Math.floor(rng() * allowedPieces.length)];
    const question = generateMoveQuestionForPiece(
      piece,
      legalCount < targetLegalCount,
      rng,
    );

    if (question) {
      questions.push(question);
      if (isLegalMove(question.from, question.to, question.piece)) {
        legalCount++;
      }
    }
  }

  return shuffleArray(questions, rng);
}

// Strategy interface for piece move generation
interface PieceMoveStrategy {
  generateCandidateMove(
    fromFile: number,
    fromRank: number,
    rng: RandomSource,
  ): { toFile: number; toRank: number };
}

// Concrete Strategies
const BishopMoveStrategy: PieceMoveStrategy = {
  generateCandidateMove(fromFile, fromRank, rng) {
    const diagonalOffset = Math.floor(rng() * 7) + 1;
    const direction = Math.floor(rng() * 4);
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
  generateCandidateMove(fromFile, fromRank, rng) {
    if (rng() < 0.5) {
      return { toFile: Math.floor(rng() * BOARD_SIZE), toRank: fromRank }; // Horizontal
    } else {
      return { toFile: fromFile, toRank: Math.floor(rng() * BOARD_SIZE) }; // Vertical
    }
  },
};

const KnightMoveStrategy: PieceMoveStrategy = {
  generateCandidateMove(fromFile, fromRank, rng) {
    const move = KNIGHT_OFFSETS[Math.floor(rng() * KNIGHT_OFFSETS.length)];
    return { toFile: fromFile + move[0], toRank: fromRank + move[1] };
  },
};

const QueenMoveStrategy: PieceMoveStrategy = {
  generateCandidateMove(fromFile, fromRank, rng) {
    if (rng() < 0.5) {
      return BishopMoveStrategy.generateCandidateMove(fromFile, fromRank, rng);
    } else {
      return RookMoveStrategy.generateCandidateMove(fromFile, fromRank, rng);
    }
  },
};

const KingMoveStrategy: PieceMoveStrategy = {
  generateCandidateMove(fromFile, fromRank, rng) {
    const move = KING_OFFSETS[Math.floor(rng() * KING_OFFSETS.length)];
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
  rng: RandomSource = Math.random,
): MoveQuestion | null {
  const strategy = PieceStrategies[pieceType];

  for (let attempts = 0; attempts < 200; attempts++) {
    const fromFile = Math.floor(rng() * BOARD_SIZE);
    const fromRank = Math.floor(rng() * BOARD_SIZE);
    const fromSquare = FILES[fromFile] + RANKS[fromRank];

    const { toFile, toRank } = preferLegal
      ? strategy.generateCandidateMove(fromFile, fromRank, rng)
      : {
          toFile: Math.floor(rng() * BOARD_SIZE),
          toRank: Math.floor(rng() * BOARD_SIZE),
        };

    if (
      toFile < 0 ||
      toFile >= BOARD_SIZE ||
      toRank < 0 ||
      toRank >= BOARD_SIZE
    )
      continue;

    const toSquare = FILES[toFile] + RANKS[toRank];
    if (toSquare === fromSquare) continue;

    const isLegal = isLegalMove(fromSquare, toSquare, pieceType);
    if (preferLegal === isLegal) {
      return { from: fromSquare, to: toSquare, piece: pieceType };
    }
  }

  return null;
}
