import { describe, expect, it } from 'vitest';

import type { PracticeSessionRow } from '@/lib/db/practice-session-types';

import { DEFAULT_PIECE_FILTER, derivePieceFilterFromSessions } from './derive-piece-filter';

// ---------------------------------------------------------------------------
// Helpers to build test session data
// ---------------------------------------------------------------------------

function makeLegalMovesSession(selectedPieces: string[], id = 'session-1'): PracticeSessionRow {
  return {
    id,
    menuType: 'legal_moves',
    startedAt: new Date(),
    settings: { timeLimit: 60, selectedPieces, mistakeAllowance: null },
    result: { correctAnswers: 5, incorrectAnswers: 1, timeTaken: 30 },
  };
}

function makeCoordinateQuizSession(id = 'cq-1'): PracticeSessionRow {
  return {
    id,
    menuType: 'coordinate_quiz',
    startedAt: new Date(),
    settings: { timeLimit: 60, boardOrientation: 'white', mistakeAllowance: null },
    result: { correctAnswers: 10, incorrectAnswers: 2, timeTaken: 45 },
  };
}

function makeSquareColorsSession(id = 'sc-1'): PracticeSessionRow {
  return {
    id,
    menuType: 'square_colors',
    startedAt: new Date(),
    settings: { timeLimit: 60, mistakeAllowance: null },
    result: { correctAnswers: 8, incorrectAnswers: 3, timeTaken: 50 },
  };
}

function makeUnknownSession(id = 'unknown-1'): PracticeSessionRow {
  return {
    id,
    menuType: 'some_future_type',
    startedAt: new Date(),
    settings: { foo: 'bar' },
    result: { baz: 42 },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('derivePieceFilterFromSessions', () => {
  describe('when there are no sessions', () => {
    it('returns DEFAULT_PIECE_FILTER (all true)', () => {
      const result = derivePieceFilterFromSessions([]);
      expect(result).toEqual(DEFAULT_PIECE_FILTER);
    });
  });

  describe('when there are no legal_moves sessions', () => {
    it('returns DEFAULT_PIECE_FILTER for coordinate_quiz sessions only', () => {
      const sessions = [makeCoordinateQuizSession('cq-1'), makeCoordinateQuizSession('cq-2')];
      expect(derivePieceFilterFromSessions(sessions)).toEqual(DEFAULT_PIECE_FILTER);
    });

    it('returns DEFAULT_PIECE_FILTER for square_colors sessions only', () => {
      const sessions = [makeSquareColorsSession('sc-1'), makeSquareColorsSession('sc-2')];
      expect(derivePieceFilterFromSessions(sessions)).toEqual(DEFAULT_PIECE_FILTER);
    });

    it('returns DEFAULT_PIECE_FILTER for unknown session types', () => {
      const sessions = [makeUnknownSession('u-1')];
      expect(derivePieceFilterFromSessions(sessions)).toEqual(DEFAULT_PIECE_FILTER);
    });
  });

  describe('single legal_moves session', () => {
    it('derives filter from a single session with one piece (knight)', () => {
      const sessions = [makeLegalMovesSession(['n'])];
      expect(derivePieceFilterFromSessions(sessions)).toEqual({
        k: false,
        q: false,
        r: false,
        b: false,
        n: true,
      });
    });

    it('derives filter from a single session with multiple pieces (knight + bishop)', () => {
      const sessions = [makeLegalMovesSession(['n', 'b'])];
      expect(derivePieceFilterFromSessions(sessions)).toEqual({
        k: false,
        q: false,
        r: false,
        b: true,
        n: true,
      });
    });

    it('derives filter from a single session with all pieces', () => {
      const sessions = [makeLegalMovesSession(['k', 'q', 'r', 'b', 'n'])];
      expect(derivePieceFilterFromSessions(sessions)).toEqual({
        k: true,
        q: true,
        r: true,
        b: true,
        n: true,
      });
    });
  });

  describe('multiple legal_moves sessions with same pieces', () => {
    it('returns matching filter when all sessions have the same single piece', () => {
      const sessions = [
        makeLegalMovesSession(['n'], 's-1'),
        makeLegalMovesSession(['n'], 's-2'),
        makeLegalMovesSession(['n'], 's-3'),
      ];
      expect(derivePieceFilterFromSessions(sessions)).toEqual({
        k: false,
        q: false,
        r: false,
        b: false,
        n: true,
      });
    });

    it('returns matching filter when all sessions have same multiple pieces', () => {
      const sessions = [
        makeLegalMovesSession(['r', 'q'], 's-1'),
        makeLegalMovesSession(['q', 'r'], 's-2'), // different order, same set
      ];
      expect(derivePieceFilterFromSessions(sessions)).toEqual({
        k: false,
        q: true,
        r: true,
        b: false,
        n: false,
      });
    });

    it('returns all true when all sessions have all pieces', () => {
      const sessions = [
        makeLegalMovesSession(['k', 'q', 'r', 'b', 'n'], 's-1'),
        makeLegalMovesSession(['n', 'b', 'r', 'q', 'k'], 's-2'), // different order
      ];
      expect(derivePieceFilterFromSessions(sessions)).toEqual({
        k: true,
        q: true,
        r: true,
        b: true,
        n: true,
      });
    });
  });

  describe('multiple legal_moves sessions with different pieces', () => {
    it('returns DEFAULT_PIECE_FILTER when sessions have different piece configurations', () => {
      const sessions = [makeLegalMovesSession(['n'], 's-1'), makeLegalMovesSession(['b'], 's-2')];
      expect(derivePieceFilterFromSessions(sessions)).toEqual(DEFAULT_PIECE_FILTER);
    });

    it('returns DEFAULT_PIECE_FILTER when one session is a subset of another', () => {
      const sessions = [
        makeLegalMovesSession(['n', 'b'], 's-1'),
        makeLegalMovesSession(['n'], 's-2'),
      ];
      expect(derivePieceFilterFromSessions(sessions)).toEqual(DEFAULT_PIECE_FILTER);
    });

    it('returns DEFAULT_PIECE_FILTER when one session has all pieces and another has a subset', () => {
      const sessions = [
        makeLegalMovesSession(['k', 'q', 'r', 'b', 'n'], 's-1'),
        makeLegalMovesSession(['k'], 's-2'),
      ];
      expect(derivePieceFilterFromSessions(sessions)).toEqual(DEFAULT_PIECE_FILTER);
    });
  });

  describe('mixed session types (legal_moves + others)', () => {
    it('only considers legal_moves sessions, ignores coordinate_quiz', () => {
      const sessions = [
        makeCoordinateQuizSession('cq-1'),
        makeLegalMovesSession(['n'], 's-1'),
        makeLegalMovesSession(['n'], 's-2'),
        makeCoordinateQuizSession('cq-2'),
      ];
      expect(derivePieceFilterFromSessions(sessions)).toEqual({
        k: false,
        q: false,
        r: false,
        b: false,
        n: true,
      });
    });

    it('only considers legal_moves sessions, ignores square_colors', () => {
      const sessions = [makeSquareColorsSession('sc-1'), makeLegalMovesSession(['b', 'r'], 's-1')];
      expect(derivePieceFilterFromSessions(sessions)).toEqual({
        k: false,
        q: false,
        r: true,
        b: true,
        n: false,
      });
    });

    it('only considers legal_moves sessions, ignores unknown types', () => {
      const sessions = [
        makeUnknownSession('u-1'),
        makeLegalMovesSession(['k', 'q'], 's-1'),
        makeLegalMovesSession(['q', 'k'], 's-2'),
      ];
      expect(derivePieceFilterFromSessions(sessions)).toEqual({
        k: true,
        q: true,
        r: false,
        b: false,
        n: false,
      });
    });

    it('returns DEFAULT_PIECE_FILTER when only non-legal_moves sessions exist among mixed types', () => {
      const sessions = [
        makeCoordinateQuizSession('cq-1'),
        makeSquareColorsSession('sc-1'),
        makeUnknownSession('u-1'),
      ];
      expect(derivePieceFilterFromSessions(sessions)).toEqual(DEFAULT_PIECE_FILTER);
    });
  });

  describe('edge cases', () => {
    it('handles empty selectedPieces array in a single session', () => {
      const sessions = [makeLegalMovesSession([])];
      expect(derivePieceFilterFromSessions(sessions)).toEqual({
        k: false,
        q: false,
        r: false,
        b: false,
        n: false,
      });
    });

    it('handles empty selectedPieces arrays in multiple sessions', () => {
      const sessions = [makeLegalMovesSession([], 's-1'), makeLegalMovesSession([], 's-2')];
      expect(derivePieceFilterFromSessions(sessions)).toEqual({
        k: false,
        q: false,
        r: false,
        b: false,
        n: false,
      });
    });

    it('treats pieces in different order as the same configuration', () => {
      const sessions = [
        makeLegalMovesSession(['b', 'n', 'k'], 's-1'),
        makeLegalMovesSession(['k', 'b', 'n'], 's-2'),
        makeLegalMovesSession(['n', 'k', 'b'], 's-3'),
      ];
      expect(derivePieceFilterFromSessions(sessions)).toEqual({
        k: true,
        q: false,
        r: false,
        b: true,
        n: true,
      });
    });

    it('returns a new object (not the same reference as DEFAULT_PIECE_FILTER) for matching derived filter', () => {
      const sessions = [makeLegalMovesSession(['k', 'q', 'r', 'b', 'n'])];
      const result = derivePieceFilterFromSessions(sessions);
      expect(result).toEqual(DEFAULT_PIECE_FILTER);
      expect(result).not.toBe(DEFAULT_PIECE_FILTER);
    });

    it('returns DEFAULT_PIECE_FILTER reference for no sessions case', () => {
      const result = derivePieceFilterFromSessions([]);
      expect(result).toBe(DEFAULT_PIECE_FILTER);
    });
  });
});
