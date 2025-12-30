// Re-export shared types from parent
export type {
  PositionAccuracy,
  PositionData,
  ScoreDetail,
  SquareDiff,
  SquareStatus,
} from '../../_lib/types';

// Position-memory specific types
export type GamePhase = 'memorize' | 'recreate' | 'result';
