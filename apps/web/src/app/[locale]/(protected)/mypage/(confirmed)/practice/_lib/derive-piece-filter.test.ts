import { describe, expect, it } from 'vitest';

import type { PracticeSessionRow } from '@/lib/db/practice-session-types';

import { DEFAULT_PIECE_SELECTION, derivePieceSelectionFromSessions } from './derive-piece-filter';

// ---------------------------------------------------------------------------
// Helpers to build test session data
// ---------------------------------------------------------------------------

function makeLegalMovesSession(selectedPiece: string, id = 'session-1'): PracticeSessionRow {
  return {
    id,
    menuType: 'legal_moves',
    startedAt: new Date(),
    settings: { timeLimit: 60, selectedPiece, mistakeAllowance: null },
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
    it('returns the piece short code when session has a specific piece (knight)', () => {
      const sessions = [makeLegalMovesSession('knight')];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('n');
    });

    it('returns random for a single session with "random"', () => {
      const sessions = [makeLegalMovesSession('random')];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });
  });

  describe('multiple legal_moves sessions with same piece', () => {
    it('returns the piece when all sessions have the same single piece', () => {
      const sessions = [
        makeLegalMovesSession('knight', 's-1'),
        makeLegalMovesSession('knight', 's-2'),
        makeLegalMovesSession('knight', 's-3'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('n');
    });

    it('returns random when all sessions have "random"', () => {
      const sessions = [
        makeLegalMovesSession('random', 's-1'),
        makeLegalMovesSession('random', 's-2'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });
  });

  describe('multiple legal_moves sessions with different pieces', () => {
    it('returns random when sessions have different piece configurations', () => {
      const sessions = [
        makeLegalMovesSession('knight', 's-1'),
        makeLegalMovesSession('bishop', 's-2'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });

    it('returns random when one session has a specific piece and another has random', () => {
      const sessions = [
        makeLegalMovesSession('knight', 's-1'),
        makeLegalMovesSession('random', 's-2'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });
  });

  describe('mixed session types (legal_moves + others)', () => {
    it('only considers legal_moves sessions, ignores coordinate_quiz', () => {
      const sessions = [
        makeCoordinateQuizSession('cq-1'),
        makeLegalMovesSession('knight', 's-1'),
        makeLegalMovesSession('knight', 's-2'),
        makeCoordinateQuizSession('cq-2'),
      ];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('n');
    });

    it('only considers legal_moves sessions, ignores square_colors', () => {
      const sessions = [makeSquareColorsSession('sc-1'), makeLegalMovesSession('bishop', 's-1')];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('b');
    });

    it('only considers legal_moves sessions, ignores unknown types', () => {
      const sessions = [
        makeUnknownSession('u-1'),
        makeLegalMovesSession('king', 's-1'),
        makeLegalMovesSession('king', 's-2'),
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
    it('each piece type can be individually selected', () => {
      expect(derivePieceSelectionFromSessions([makeLegalMovesSession('king')])).toBe('k');
      expect(derivePieceSelectionFromSessions([makeLegalMovesSession('queen')])).toBe('q');
      expect(derivePieceSelectionFromSessions([makeLegalMovesSession('rook')])).toBe('r');
      expect(derivePieceSelectionFromSessions([makeLegalMovesSession('bishop')])).toBe('b');
      expect(derivePieceSelectionFromSessions([makeLegalMovesSession('knight')])).toBe('n');
    });

    it('returns random with a large number of consistent single-piece sessions', () => {
      const sessions = Array.from({ length: 50 }, (_, i) =>
        makeLegalMovesSession('bishop', `s-${i}`)
      );
      expect(derivePieceSelectionFromSessions(sessions)).toBe('b');
    });

    it('returns random for unknown piece name', () => {
      const sessions = [makeLegalMovesSession('pawn')];
      expect(derivePieceSelectionFromSessions(sessions)).toBe('random');
    });
  });
});
