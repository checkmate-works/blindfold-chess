// @vitest-environment jsdom
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GameLimitError } from '@/lib/errors';

import { handleGameLimitError } from './game-limit-error';

describe('handleGameLimitError', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseGameData = {
    playerColor: 'white' as const,
    skillLevel: 1 as const,
    status: 'in_progress',
  };

  describe('when moves.length === 0', () => {
    it('should dispatch game-limit-start-error event', () => {
      const listener = vi.fn();
      window.addEventListener('blindfold-chess:game-limit-start-error', listener);

      handleGameLimitError(new GameLimitError('limit reached'), {
        ...baseGameData,
        moves: [] as AlgebraicNotation[],
      });

      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener('blindfold-chess:game-limit-start-error', listener);
    });

    it('should not write to sessionStorage', () => {
      handleGameLimitError(new GameLimitError('limit reached'), {
        ...baseGameData,
        moves: [] as AlgebraicNotation[],
      });

      expect(sessionStorage.getItem('blindfold_chess_pending_game')).toBeNull();
      expect(sessionStorage.getItem('blindfold_chess_game_limit_reached')).toBeNull();
    });

    it('should not dispatch game-limit-reached event', () => {
      const listener = vi.fn();
      window.addEventListener('blindfold-chess:game-limit-reached', listener);

      handleGameLimitError(new GameLimitError('limit reached'), {
        ...baseGameData,
        moves: [] as AlgebraicNotation[],
      });

      expect(listener).not.toHaveBeenCalled();
      window.removeEventListener('blindfold-chess:game-limit-reached', listener);
    });
  });

  describe('when moves.length > 0', () => {
    const movesGameData = {
      ...baseGameData,
      moves: ['e4', 'e5', 'Nf3'] as AlgebraicNotation[],
    };

    it('should write pending game data to sessionStorage', () => {
      handleGameLimitError(new GameLimitError('limit reached'), movesGameData);

      const stored = sessionStorage.getItem('blindfold_chess_pending_game');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual({
        moves: ['e4', 'e5', 'Nf3'],
        playerColor: 'white',
        skillLevel: 1,
        status: 'in_progress',
      });
    });

    it('should set game_limit_reached flag in sessionStorage', () => {
      handleGameLimitError(new GameLimitError('limit reached'), movesGameData);

      expect(sessionStorage.getItem('blindfold_chess_game_limit_reached')).toBe('true');
    });

    it('should dispatch game-limit-reached event', () => {
      const listener = vi.fn();
      window.addEventListener('blindfold-chess:game-limit-reached', listener);

      handleGameLimitError(new GameLimitError('limit reached'), movesGameData);

      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener('blindfold-chess:game-limit-reached', listener);
    });

    it('should not dispatch game-limit-start-error event', () => {
      const listener = vi.fn();
      window.addEventListener('blindfold-chess:game-limit-start-error', listener);

      handleGameLimitError(new GameLimitError('limit reached'), movesGameData);

      expect(listener).not.toHaveBeenCalled();
      window.removeEventListener('blindfold-chess:game-limit-start-error', listener);
    });
  });

  it('should log a warning with the error message', () => {
    handleGameLimitError(new GameLimitError('max games exceeded'), {
      ...baseGameData,
      moves: ['e4'] as AlgebraicNotation[],
    });

    expect(console.warn).toHaveBeenCalledWith(
      'Game limit reached, cannot save game:',
      'max games exceeded'
    );
  });
});
