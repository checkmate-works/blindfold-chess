// Re-export shared types: PositionAccuracy / ScoreDetail / SquareDiff /
// SquareStatus come from the features package (platform-agnostic); PositionData
// stays web-local because it describes a session-setup shape.
export type {
  PositionAccuracy,
  ScoreDetail,
  SquareDiff,
  SquareStatus,
} from '@blindfold-chess/features/common';
export type { PositionData } from '@/app/[locale]/(public)/practice/_lib/types';
