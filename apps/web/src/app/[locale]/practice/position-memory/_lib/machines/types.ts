import type { PositionAccuracy, PositionData } from '../types';

/**
 * Mode of the position memory session
 * - 'tutorial': User started from tutorial page with preset or single FEN (60s, 1 problem)
 * - 'custom': User configured their own settings via setup page
 */
export type SessionMode = 'tutorial' | 'custom';

/**
 * Context for the position memory state machine
 */
export type PositionMemoryContext = {
  mode: SessionMode;
  positions: PositionData[];
  timeLimit: number;
  currentProblemIndex: number;
  recreatedPosition: string;
  memorizeTimeLeft: number;
  currentAccuracy: PositionAccuracy | null;
  problemResults: Map<number, PositionAccuracy>;
  recreatedPositions: Map<number, string>;
  skippedProblems: Set<number>;
  showQuitModal: boolean;
};

/**
 * Events for the position memory state machine
 */
export type PositionMemoryEvent =
  | { type: 'SET_POSITIONS'; positions: PositionData[] }
  | { type: 'MEMORIZED' }
  | { type: 'TICK' }
  | { type: 'UPDATE_POSITION'; fen: string }
  | { type: 'SUBMIT'; accuracy: PositionAccuracy }
  | { type: 'VIEW_AGAIN' }
  | { type: 'SKIP' }
  | { type: 'NEXT_PROBLEM' }
  | { type: 'VIEW_RESULTS' }
  | { type: 'OPEN_QUIT_MODAL' }
  | { type: 'CONFIRM_QUIT' }
  | { type: 'CANCEL_QUIT' }
  | { type: 'PLAY_AGAIN' };

/**
 * Input for initializing the position memory machine
 */
export type PositionMemoryInput = {
  positions: PositionData[];
  timeLimit: number;
  mode: SessionMode;
  skipMemorize?: boolean;
};
