import type { GameStatus } from '@blindfold-chess/features/ai-game';
import { describe, expect, it } from 'vitest';

import { mapGameStatusToOutcome } from './map-game-status-to-outcome';

describe('mapGameStatusToOutcome', () => {
  it('returns "in_progress" while the game is still running, regardless of player result', () => {
    expect(mapGameStatusToOutcome('in_progress', null)).toBe('in_progress');
    expect(mapGameStatusToOutcome('in_progress', 'win')).toBe('in_progress');
    expect(mapGameStatusToOutcome('in_progress', 'loss')).toBe('in_progress');
    expect(mapGameStatusToOutcome('in_progress', 'draw')).toBe('in_progress');
  });

  it('returns "win" when the game is over and the player won', () => {
    expect(mapGameStatusToOutcome('checkmate' as GameStatus, 'win')).toBe('win');
  });

  it('returns "loss" when the game is over and the player lost', () => {
    expect(mapGameStatusToOutcome('checkmate' as GameStatus, 'loss')).toBe('loss');
  });

  it('returns "draw" on draw', () => {
    expect(mapGameStatusToOutcome('stalemate' as GameStatus, 'draw')).toBe('draw');
  });

  it('treats null playerResult as a draw once the game is over', () => {
    expect(mapGameStatusToOutcome('stalemate' as GameStatus, null)).toBe('draw');
  });
});
