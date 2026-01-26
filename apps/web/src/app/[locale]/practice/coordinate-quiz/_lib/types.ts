import { Square } from 'chess.js';

export const BOARD_ORIENTATIONS = ['white', 'black', 'random'] as const;
export type BoardOrientation = (typeof BOARD_ORIENTATIONS)[number];

export const FEEDBACK_SPEEDS = ['fast', 'normal', 'slow'] as const;
export type FeedbackSpeed = (typeof FEEDBACK_SPEEDS)[number];

// Feedback speed to milliseconds mapping
export const FEEDBACK_SPEED_MS: Record<FeedbackSpeed, number> = {
  fast: 300,
  normal: 600,
  slow: 900,
};

export type CoordinateQuestion = {
  targetSquare: Square;
  orientation: Exclude<BoardOrientation, 'random'>;
};
