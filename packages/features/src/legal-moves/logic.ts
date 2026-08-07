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
  allowedPieces: readonly PieceType[] = ["b", "n", "r", "q", "k"],
  rng: RandomSource = Math.random,
): MoveQuestion[] {
  const questions: MoveQuestion[] = [];
  const targetLegalCount = Math.floor(count * 0.5); // Aim for 50% legal moves
  let legalCount = 0;

  // Both generators are themselves bounded (200 attempts each) and return
  // null only when a piece/rng combination cannot produce a question. The
  // outer bound turns that pathological case into a short batch instead of
  // an unbounded spin; with a real RNG it is never approached.
  const maxAttempts = count * 4;
  for (
    let attempts = 0;
    questions.length < count && attempts < maxAttempts;
    attempts++
  ) {
    const piece = allowedPieces[Math.floor(rng() * allowedPieces.length)];
    const wantLegal = legalCount < targetLegalCount;
    const question = wantLegal
      ? generateLegalMoveQuestion(piece, rng)
      : generateIllegalMoveQuestion(piece, rng);

    if (question) {
      questions.push(question);
      // The generator's `accept` predicate already guarantees the legality of
      // what it returns — re-deriving it here (as this loop once did via a
      // second chess.js legality check) could only ever disagree with the
      // branch that produced the question.
      if (wantLegal) legalCount++;
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

/**
 * Bounded retry loop shared by both move-question generators: on each attempt
 * pick a random origin square, hand it to `pickTarget`, reject off-board /
 * self moves, and return the first move whose legality `accept`s.
 */
function findMoveQuestion(
  pieceType: PieceType,
  rng: RandomSource,
  pickTarget: (
    strategy: PieceMoveStrategy,
    fromFile: number,
    fromRank: number,
    rng: RandomSource,
  ) => { toFile: number; toRank: number } | null,
  accept: (isLegal: boolean) => boolean,
): MoveQuestion | null {
  const strategy = PieceStrategies[pieceType];

  for (let attempts = 0; attempts < 200; attempts++) {
    const fromFile = Math.floor(rng() * BOARD_SIZE);
    const fromRank = Math.floor(rng() * BOARD_SIZE);
    const fromSquare = FILES[fromFile] + RANKS[fromRank];

    const target = pickTarget(strategy, fromFile, fromRank, rng);
    // No target produced from this origin (e.g. a knight cornered with the RNG
    // hitting empty offsets). Re-roll the origin.
    if (!target) continue;
    const { toFile, toRank } = target;

    if (
      toFile < 0 ||
      toFile >= BOARD_SIZE ||
      toRank < 0 ||
      toRank >= BOARD_SIZE
    )
      continue;

    const toSquare = FILES[toFile] + RANKS[toRank];
    if (toSquare === fromSquare) continue;

    if (accept(isLegalMove(fromSquare, toSquare, pieceType))) {
      return { from: fromSquare, to: toSquare, piece: pieceType };
    }
  }

  return null;
}

// Generate a move question whose move IS legal for the piece type. Targets are
// drawn from the piece's pure mobility so a legal candidate is found quickly.
export function generateLegalMoveQuestion(
  pieceType: PieceType,
  rng: RandomSource = Math.random,
): MoveQuestion | null {
  return findMoveQuestion(
    pieceType,
    rng,
    (strategy, fromFile, fromRank, r) =>
      strategy.generateCandidateMove(fromFile, fromRank, r),
    (isLegal) => isLegal,
  );
}

// Generate a move question whose move is NOT legal for the piece type. Targets
// are drawn uniformly at random and kept only when they turn out illegal.
export function generateIllegalMoveQuestion(
  pieceType: PieceType,
  rng: RandomSource = Math.random,
): MoveQuestion | null {
  return findMoveQuestion(
    pieceType,
    rng,
    (_strategy, _fromFile, _fromRank, r) => ({
      toFile: Math.floor(r() * BOARD_SIZE),
      toRank: Math.floor(r() * BOARD_SIZE),
    }),
    (isLegal) => !isLegal,
  );
}
