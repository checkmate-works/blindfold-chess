import { Square } from 'chess.js';

export type BoardOrientation = 'white' | 'black' | 'random';

export type CoordinateQuestion = {
  targetSquare: Square;
  orientation: 'white' | 'black';
};
