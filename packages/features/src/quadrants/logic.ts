import type { ResolvedBoardOrientation, Square } from "@blindfold-chess/types";

import {
  type RandomSource,
  generateRandomSquare,
  resolveOrientation,
  squareToFileIndex,
  squareToRankIndex,
} from "../common";
import { BOARD_SIZE } from "../common/constants";
import type {
  BoardOrientation,
  QuadrantId,
  QuadrantQuestion,
  VisualQuadrant,
} from "./types";

const QUADRANT_ID_BY_VISUAL_QUADRANT: Record<VisualQuadrant, QuadrantId> = {
  "top-left": "q2",
  "top-right": "q1",
  "bottom-left": "q3",
  "bottom-right": "q4",
};

/** Classify zero-based board indices whose origin is the visual top-left. */
export function getVisualQuadrant(
  fileIndex: number,
  rankIndex: number,
): VisualQuadrant {
  const halfBoard = BOARD_SIZE / 2;
  const vertical = rankIndex < halfBoard ? "top" : "bottom";
  const horizontal = fileIndex < halfBoard ? "left" : "right";
  return `${vertical}-${horizontal}`;
}

export function visualQuadrantToId(quadrant: VisualQuadrant): QuadrantId {
  return QUADRANT_ID_BY_VISUAL_QUADRANT[quadrant];
}

const OPPOSITE_VISUAL_QUADRANT: Record<VisualQuadrant, VisualQuadrant> = {
  "top-left": "bottom-right",
  "top-right": "bottom-left",
  "bottom-left": "top-right",
  "bottom-right": "top-left",
};

/**
 * The quadrant drawn at a screen position of a board viewed from
 * `orientation`.
 *
 * {@link visualQuadrantToId} assumes white's view. Flipping the board for
 * black rotates it 180°, so each screen corner then shows the quadrant that
 * sits in the opposite corner from white's side (top-left shows `q4`, e1–h4).
 */
export function quadrantIdAtVisualPosition(
  position: VisualQuadrant,
  orientation: ResolvedBoardOrientation,
): QuadrantId {
  return visualQuadrantToId(
    orientation === "white" ? position : OPPOSITE_VISUAL_QUADRANT[position],
  );
}

/**
 * Determine which quadrant a square belongs to (from white's perspective).
 *
 * Quadrant layout (white orientation):
 *   q2 (Queen-side / Opponent) | q1 (King-side / Opponent)
 *   q3 (Queen-side / You)      | q4 (King-side / You)
 *
 * Files a-d = Queen-side, Files e-h = King-side
 * Ranks 1-4 = Your side, Ranks 5-8 = Opponent side
 */
export function getCorrectQuadrant(square: Square): QuadrantId {
  const fileIndex = squareToFileIndex(square);
  const topOriginRankIndex = BOARD_SIZE - 1 - squareToRankIndex(square);
  return visualQuadrantToId(getVisualQuadrant(fileIndex, topOriginRankIndex));
}

/**
 * Generate a single quadrant question with a random square and resolved orientation.
 *
 * @param rng Random number source for deterministic testing
 */
export function generateQuadrantQuestion(
  orientation: BoardOrientation,
  rng: RandomSource = Math.random,
): QuadrantQuestion {
  return {
    square: generateRandomSquare(rng),
    orientation: resolveOrientation(orientation, rng),
  };
}

/**
 * Generate a batch of quadrant questions.
 *
 * @param rng Random number source for deterministic testing
 */
export function generateQuadrantQuestionBatch(
  size: number,
  orientation: BoardOrientation,
  rng: RandomSource = Math.random,
): QuadrantQuestion[] {
  return Array.from({ length: size }, () =>
    generateQuadrantQuestion(orientation, rng),
  );
}

/**
 * Check if the user's answer is correct.
 */
export function checkQuadrantAnswer(
  square: Square,
  selectedQuadrant: QuadrantId,
): boolean {
  return getCorrectQuadrant(square) === selectedQuadrant;
}

/**
 * How long an answer's feedback stays up, in ms, in both the timed run and
 * training. A right answer flashes briefly so a fluent player keeps their
 * rhythm; a wrong one stays up three times as long, so the player can see
 * where the square actually was before the next question replaces it.
 */
export const quadrantFeedbackDuration = (correct: boolean): number =>
  correct ? 500 : 1500;
