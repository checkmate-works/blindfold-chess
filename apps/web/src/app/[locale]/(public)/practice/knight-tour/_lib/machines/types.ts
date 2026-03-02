/**
 * Mode of the knight tour session
 * - 'tutorial': User started from tutorial page (guided introduction)
 * - 'practice': User configured their own settings via setup page
 */
export type SessionMode = 'tutorial' | 'practice';

/**
 * Settings for the knight tour
 */
export type KnightTourSettings = {
  startingSquareOption: string; // 'random' or specific square like 'e4'
  blindfoldMode: boolean;
};

/**
 * Context for the knight tour state machine
 */
export type KnightTourContext = {
  mode: SessionMode;
  settings: KnightTourSettings;
  startingSquare: string;
  currentSquare: string;
  visitedSquares: Map<string, number>;
  moveHistory: string[];
  isBlindfolded: boolean;
  showQuitModal: boolean;
};

/**
 * Events for the knight tour state machine
 */
export type KnightTourEvent =
  | { type: 'START_GAME' }
  | { type: 'MOVE'; targetSquare: string }
  | { type: 'UNDO' }
  | { type: 'OPEN_QUIT_MODAL' }
  | { type: 'CONFIRM_QUIT' }
  | { type: 'CANCEL_QUIT' }
  | { type: 'PLAY_AGAIN' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<KnightTourSettings> };

/**
 * Input for initializing the knight tour machine
 */
export type KnightTourInput = {
  mode: SessionMode;
  settings: KnightTourSettings;
};
