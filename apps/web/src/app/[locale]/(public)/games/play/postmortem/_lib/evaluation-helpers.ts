export type MoveLogEntry = {
  moveNumber: number;
  isWhiteMove: boolean;
  move: string;
  status: 'correct' | 'incorrect' | 'auto';
  incorrectMove?: string;
};
