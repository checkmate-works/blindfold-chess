import type { Square } from "@blindfold-chess/types";

import type { RandomSource } from "../common";
import { BOARD_LAST_INDEX } from "../common/constants";

import { FILES, RANKS } from "./constants";
import type { BoardSymmetryProblem, SymmetryType } from "./types";
import { SYMMETRY_TYPES } from "./types";

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
  const fileIndex = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rankIndex = RANKS.indexOf(square[1] as (typeof RANKS)[number]);

  let targetFileIndex = fileIndex;
  let targetRankIndex = rankIndex;

  switch (type) {
    case "horizontal":
      targetFileIndex = BOARD_LAST_INDEX - fileIndex;
      break;
    case "vertical":
      targetRankIndex = BOARD_LAST_INDEX - rankIndex;
      break;
    case "point":
      targetFileIndex = BOARD_LAST_INDEX - fileIndex;
      targetRankIndex = BOARD_LAST_INDEX - rankIndex;
      break;
  }

  return `${FILES[targetFileIndex]}${RANKS[targetRankIndex]}` as Square;
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
