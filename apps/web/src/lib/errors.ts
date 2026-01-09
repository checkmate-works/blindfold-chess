/**
 * Error thrown when attempting to save a game would exceed the maximum allowed games
 */
export class GameLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameLimitError';
  }
}
