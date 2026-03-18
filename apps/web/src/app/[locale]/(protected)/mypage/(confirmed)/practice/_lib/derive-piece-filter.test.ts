import { describe, expect, it } from 'vitest';

import type { PracticeSessionRow } from '@/lib/db/practice-session-types';

import { DEFAULT_PIECE_SELECTION, derivePieceSelectionFromSessions } from './derive-piece-filter';

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

describe('derivePieceSelectionFromSessions', () => {
  describe('when there are no sessions', () => {
    it('returns DEFAULT_PIECE_SELECTION (random)', () => {
      const result = derivePieceSelectionFromSessions([]);
      expect(result).toBe(DEFAULT_PIECE_SELECTION);
      expect(result).toBe('random');
    });
  });

  describe('when there are no legal_moves sessions', () => {
    it('returns random for coordinate_quiz sessions only', () => {
      const sessions = [makeCoordinateQuizSession('cq-1'), makeCoordinateQuizSession('cq-2')];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random for square_colors sessions only', () => {
      const sessions = [makeSquareColorsSession('sc-1'), makeSquareColorsSession('sc-2')];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random for unknown session types', () => {
      const sessions = [makeUnknownSession('u-1')];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });
  });

  describe('single legal_moves session', () => {
    it('returns the piece when session has a single piece (knight)', () => {
      const sessions = [makeLegalMovesSession(['n'])];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('n');
    });

    it('returns random for a single session with all pieces', () => {
      const sessions = [makeLegalMovesSession(['k', 'q', 'r', 'b', 'n'])];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random for a single session with a multi-piece combination (legacy)', () => {
      const sessions = [makeLegalMovesSession(['n', 'b'])];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });
  });

  describe('multiple legal_moves sessions with same pieces', () => {
    it('returns the piece when all sessions have the same single piece', () => {
      const sessions = [
        makeLegalMovesSession(['n'], 's-1'),
        makeLegalMovesSession(['n'], 's-2'),
        makeLegalMovesSession(['n'], 's-3'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('n');
    });

    it('returns random when all sessions have same multi-piece legacy combination', () => {
      const sessions = [
        makeLegalMovesSession(['r', 'q'], 's-1'),
        makeLegalMovesSession(['q', 'r'], 's-2'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random when all sessions have all pieces', () => {
      const sessions = [
        makeLegalMovesSession(['k', 'q', 'r', 'b', 'n'], 's-1'),
        makeLegalMovesSession(['n', 'b', 'r', 'q', 'k'], 's-2'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });
  });

  describe('multiple legal_moves sessions with different pieces', () => {
    it('returns random when sessions have different piece configurations', () => {
      const sessions = [makeLegalMovesSession(['n'], 's-1'), makeLegalMovesSession(['b'], 's-2')];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random when one session is a subset of another', () => {
      const sessions = [
        makeLegalMovesSession(['n', 'b'], 's-1'),
        makeLegalMovesSession(['n'], 's-2'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random when one session has all pieces and another has a subset', () => {
      const sessions = [
        makeLegalMovesSession(['k', 'q', 'r', 'b', 'n'], 's-1'),
        makeLegalMovesSession(['k'], 's-2'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
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
      expect(derivePieceSelectionFromSessions(sessions)).toBe('n');
    });

    it('only considers legal_moves sessions, ignores square_colors', () => {
      const sessions = [makeSquareColorsSession('sc-1'), makeLegalMovesSession(['b'], 's-1')];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('b');
    });

    it('only considers legal_moves sessions, ignores unknown types', () => {
      const sessions = [
        makeUnknownSession('u-1'),
        makeLegalMovesSession(['k'], 's-1'),
        makeLegalMovesSession(['k'], 's-2'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('k');
    });

    it('returns random when only non-legal_moves sessions exist among mixed types', () => {
      const sessions = [
        makeCoordinateQuizSession('cq-1'),
        makeSquareColorsSession('sc-1'),
        makeUnknownSession('u-1'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });
  });

  describe('edge cases', () => {
    it('returns random for empty selectedPieces array in a single session', () => {
      const sessions = [makeLegalMovesSession([])];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random for empty selectedPieces arrays in multiple sessions', () => {
      const sessions = [makeLegalMovesSession([], 's-1'), makeLegalMovesSession([], 's-2')];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('treats pieces in different order as the same configuration', () => {
      const sessions = [makeLegalMovesSession(['k'], 's-1'), makeLegalMovesSession(['k'], 's-2')];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('k');
    });

    it('each piece type can be individually selected', () => {
      expect(derivePieceSelectionFromSessions([makeLegalMovesSession(['k'])])).toBe('k');
      expect(derivePieceSelectionFromSessions([makeLegalMovesSession(['q'])])).toBe('q');
      expect(derivePieceSelectionFromSessions([makeLegalMovesSession(['r'])])).toBe('r');
      expect(derivePieceSelectionFromSessions([makeLegalMovesSession(['b'])])).toBe('b');
      expect(derivePieceSelectionFromSessions([makeLegalMovesSession(['n'])])).toBe('n');
    });

    it('returns random for sessions with duplicate pieces', () => {
      const sessions = [makeLegalMovesSession(['n', 'n'])];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random when all-5-pieces are in different order across sessions', () => {
      const sessions = [
        makeLegalMovesSession(['n', 'b', 'r', 'q', 'k'], 's-1'),
        makeLegalMovesSession(['k', 'b', 'n', 'q', 'r'], 's-2'),
        makeLegalMovesSession(['r', 'q', 'k', 'n', 'b'], 's-3'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random for 3-piece legacy combination', () => {
      const sessions = [makeLegalMovesSession(['n', 'b', 'r'])];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random for 4-piece legacy combination', () => {
      const sessions = [makeLegalMovesSession(['k', 'q', 'r', 'b'])];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random when one session has single piece and another has all-5 pieces', () => {
      const sessions = [
        makeLegalMovesSession(['n'], 's-1'),
        makeLegalMovesSession(['k', 'q', 'r', 'b', 'n'], 's-2'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random with a large number of consistent single-piece sessions', () => {
      const sessions = Array.from({ length: 50 }, (_, i) => makeLegalMovesSession(['b'], `s-${i}`));
      expect(derivePieceSelectionFromSessions(sessions)).toBe('b');
    });
  });
});
