import { isLegalPieceMove } from "../chess-core";

import {
  type RandomSource,
  FILES,
  RANKS,
  getMovesForPiece,
  shuffleArray,
  squareToFileIndex,
  squareToRankIndex,
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

// Strategy interface for piece move generation. Pure mobility (boundary-aware,
// blocker-agnostic) is delegated to `common/getMovesForPiece`; this strategy
// layer only owns the random selection from the resulting candidate list.
interface PieceMoveStrategy {
  generateCandidateMove(
    fromFile: number,
    fromRank: number,
    rng: RandomSource,
  ): { toFile: number; toRank: number } | null;
}

function pickFromMobility(
  piece: PieceType,
  fromFile: number,
  fromRank: number,
  rng: RandomSource,
): { toFile: number; toRank: number } | null {
  const candidates = getMovesForPiece(piece, fromFile, fromRank);
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(rng() * candidates.length)];
  return {
    toFile: squareToFileIndex(pick),
    toRank: squareToRankIndex(pick),
  };
}

const PieceStrategies: Record<PieceType, PieceMoveStrategy> = {
  b: {
    generateCandidateMove: (f, r, rng) => pickFromMobility("b", f, r, rng),
  },
  n: {
    generateCandidateMove: (f, r, rng) => pickFromMobility("n", f, r, rng),
  },
  r: {
    generateCandidateMove: (f, r, rng) => pickFromMobility("r", f, r, rng),
  },
  q: {
    generateCandidateMove: (f, r, rng) => pickFromMobility("q", f, r, rng),
  },
  k: {
    generateCandidateMove: (f, r, rng) => pickFromMobility("k", f, r, rng),
  },
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

    let toFile: number;
    let toRank: number;
    if (preferLegal) {
      const candidate = strategy.generateCandidateMove(fromFile, fromRank, rng);
      // No legal target from this origin (e.g., a knight on a corner with the
      // RNG hitting empty offsets). Re-roll the origin.
      if (!candidate) continue;
      toFile = candidate.toFile;
      toRank = candidate.toRank;
    } else {
      toFile = Math.floor(rng() * BOARD_SIZE);
      toRank = Math.floor(rng() * BOARD_SIZE);
    }

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
