import type { Square } from "@blindfold-chess/types";

import type { MirrorAxis, RandomSource } from "../common";
import { mirrorSquare } from "../common";

import { FILES, RANKS } from "./constants";
import type { BoardSymmetryProblem, SymmetryType } from "./types";
import { SYMMETRY_TYPES } from "./types";

/**
 * Map the `board-symmetry` `SymmetryType` ("horizontal" | "vertical" | "point")
 * onto the geometric `MirrorAxis` used by {@link mirrorSquare}. Note that
 * "horizontal" symmetry on the board surface corresponds to a reflection
 * across the file axis (left-right mirror), and "vertical" to a reflection
 * across the rank axis (top-bottom mirror).
 */
const SYMMETRY_TYPE_TO_AXIS: Record<SymmetryType, MirrorAxis> = {
  horizontal: "file",
  vertical: "rank",
  point: "point",
};

/**
 * Generate a random board symmetry problem
 */
export function generateProblem(
  rng: RandomSource = Math.random,
): BoardSymmetryProblem {
  const randomFile = FILES[Math.floor(rng() * FILES.length)];
  const randomRank = RANKS[Math.floor(rng() * RANKS.length)];
  const randomType = SYMMETRY_TYPES[Math.floor(rng() * SYMMETRY_TYPES.length)];

  return {
    square: `${randomFile}${randomRank}` as Square,
    type: randomType,
  };
}

/**
 * Calculate the symmetric square for a given square and symmetry type
 *
 * - horizontal: file is mirrored (a<->h, b<->g, c<->f, d<->e)
 * - vertical: rank is mirrored (1<->8, 2<->7, 3<->6, 4<->5)
 * - point: both file and rank are mirrored (180-degree rotation)
 */
export function calculateSymmetricSquare(
  square: Square,
  type: SymmetryType,
): Square {
  return mirrorSquare(square, SYMMETRY_TYPE_TO_AXIS[type]);
}

/**
 * Check if the given answer is correct for a board symmetry problem
 */
export function checkSymmetryAnswer(
  file: string,
  rank: string,
  problem: BoardSymmetryProblem,
): { isCorrect: boolean; correctSquare: Square } {
  const correctSquare = calculateSymmetricSquare(problem.square, problem.type);
  const isCorrect = `${file}${rank}` === correctSquare;

  return { isCorrect, correctSquare };
}
