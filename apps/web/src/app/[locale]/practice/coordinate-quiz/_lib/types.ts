import { Square } from 'chess.js';

export const BOARD_ORIENTATIONS = ['white', 'black', 'random'] as const;
export type BoardOrientation = (typeof BOARD_ORIENTATIONS)[number];

export type CoordinateQuestion = {
  targetSquare: Square;
  orientation: Exclude<BoardOrientation, 'random'>;
};
