import { describe, expect, it } from 'vitest';

import { deriveLeaderboardKey } from './leaderboard-key';

describe('deriveLeaderboardKey', () => {
  describe('coordinate_quiz', () => {
    it('returns boardOrientation value when it is a string', () => {
      expect(deriveLeaderboardKey('coordinate_quiz', { boardOrientation: 'white' })).toBe('white');
      expect(deriveLeaderboardKey('coordinate_quiz', { boardOrientation: 'black' })).toBe('black');
      expect(deriveLeaderboardKey('coordinate_quiz', { boardOrientation: 'random' })).toBe(
        'random'
      );
    });

    it('returns null when boardOrientation is missing', () => {
      expect(deriveLeaderboardKey('coordinate_quiz', {})).toBeNull();
    });

    it('returns null when boardOrientation is not a string', () => {
      expect(deriveLeaderboardKey('coordinate_quiz', { boardOrientation: 123 })).toBeNull();
      expect(deriveLeaderboardKey('coordinate_quiz', { boardOrientation: null })).toBeNull();
      expect(deriveLeaderboardKey('coordinate_quiz', { boardOrientation: undefined })).toBeNull();
      expect(deriveLeaderboardKey('coordinate_quiz', { boardOrientation: true })).toBeNull();
    });
  });

  describe('legal_moves', () => {
    it('returns selectedPiece value when it is a string', () => {
      expect(deriveLeaderboardKey('legal_moves', { selectedPiece: 'king' })).toBe('king');
      expect(deriveLeaderboardKey('legal_moves', { selectedPiece: 'queen' })).toBe('queen');
      expect(deriveLeaderboardKey('legal_moves', { selectedPiece: 'rook' })).toBe('rook');
      expect(deriveLeaderboardKey('legal_moves', { selectedPiece: 'bishop' })).toBe('bishop');
      expect(deriveLeaderboardKey('legal_moves', { selectedPiece: 'knight' })).toBe('knight');
      expect(deriveLeaderboardKey('legal_moves', { selectedPiece: 'random' })).toBe('random');
    });

    it('returns null when selectedPiece is missing', () => {
      expect(deriveLeaderboardKey('legal_moves', {})).toBeNull();
    });

    it('returns null when selectedPiece is not a string', () => {
      expect(deriveLeaderboardKey('legal_moves', { selectedPiece: 42 })).toBeNull();
      expect(deriveLeaderboardKey('legal_moves', { selectedPiece: null })).toBeNull();
    });
  });

  describe('square_colors', () => {
    it('always returns "default" regardless of settings', () => {
      expect(deriveLeaderboardKey('square_colors', {})).toBe('default');
      expect(deriveLeaderboardKey('square_colors', { anything: 'value' })).toBe('default');
    });
  });

  describe('diagonal_quiz', () => {
    it('always returns "default" regardless of settings', () => {
      expect(deriveLeaderboardKey('diagonal_quiz', {})).toBe('default');
      expect(deriveLeaderboardKey('diagonal_quiz', { anything: 'value' })).toBe('default');
    });
  });

  describe('unsupported menu types', () => {
    it('returns null for menu types without leaderboard segmentation', () => {
      expect(deriveLeaderboardKey('route_planner', {})).toBeNull();
      expect(deriveLeaderboardKey('board_symmetry', {})).toBeNull();
      expect(deriveLeaderboardKey('position_memory', {})).toBeNull();
      expect(deriveLeaderboardKey('knight_tour', {})).toBeNull();
    });

    it('returns null for unsupported menu types even when settings contain valid keys', () => {
      expect(deriveLeaderboardKey('route_planner', { selectedPiece: 'king' })).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('coordinate_quiz ignores extra settings properties', () => {
      expect(
        deriveLeaderboardKey('coordinate_quiz', {
          boardOrientation: 'white',
          extra: 'value',
          selectedPiece: 'king',
        })
      ).toBe('white');
    });

    it('legal_moves ignores extra settings properties', () => {
      expect(
        deriveLeaderboardKey('legal_moves', {
          selectedPiece: 'rook',
          boardOrientation: 'black',
          extra: true,
        })
      ).toBe('rook');
    });

    it('coordinate_quiz returns empty string when boardOrientation is empty string', () => {
      expect(deriveLeaderboardKey('coordinate_quiz', { boardOrientation: '' })).toBe('');
    });

    it('legal_moves returns empty string when selectedPiece is empty string', () => {
      expect(deriveLeaderboardKey('legal_moves', { selectedPiece: '' })).toBe('');
    });

    it('coordinate_quiz returns null when boardOrientation is an array', () => {
      expect(deriveLeaderboardKey('coordinate_quiz', { boardOrientation: ['white'] })).toBeNull();
    });

    it('coordinate_quiz returns null when boardOrientation is an object', () => {
      expect(
        deriveLeaderboardKey('coordinate_quiz', { boardOrientation: { value: 'white' } })
      ).toBeNull();
    });

    it('legal_moves returns null when selectedPiece is an array', () => {
      expect(deriveLeaderboardKey('legal_moves', { selectedPiece: ['king'] })).toBeNull();
    });

    it('returns null for empty string menu type', () => {
      expect(deriveLeaderboardKey('' as never, {})).toBeNull();
    });
  });
});
