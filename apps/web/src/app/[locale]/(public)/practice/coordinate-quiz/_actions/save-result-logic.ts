import type { CoordinateQuizResult, CoordinateQuizSettings } from '@/lib/db/practice-session-types';

export type SaveCoordinateQuizResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  timeLimit: number;
  boardOrientation: string;
  mistakeAllowance: number;
};

export function buildCoordinateQuizData(input: SaveCoordinateQuizResultInput): {
  menuType: 'coordinate_quiz';
  settings: CoordinateQuizSettings;
  result: CoordinateQuizResult;
} {
  const settings: CoordinateQuizSettings = {
    timeLimit: input.timeLimit,
    boardOrientation: input.boardOrientation,
    mistakeAllowance: input.mistakeAllowance,
  };

  const result: CoordinateQuizResult = {
    correctAnswers: input.correctAnswers,
    incorrectAnswers: input.incorrectAnswers,
    timeTaken: input.timeTaken,
  };

  return { menuType: 'coordinate_quiz', settings, result };
}
