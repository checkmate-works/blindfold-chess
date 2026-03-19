import { describe, expect, it } from 'vitest';

import {
  type PracticeSessionRow,
  getSessionScoreFields,
  isTypedSession,
  parsePracticeSession,
} from './practice-session-types';

describe('parsePracticeSession', () => {
  const baseRow = {
    id: 'session-1',
    startedAt: new Date('2025-06-01T10:00:00Z'),
  };

  describe('known menuTypes produce TypedPracticeSession', () => {
    it('parses coordinate_quiz as typed session', () => {
      const row = {
        ...baseRow,
        menuType: 'coordinate_quiz',
        settings: { timeLimit: 60, boardOrientation: 'white', mistakeAllowance: 3 },
        result: { correctAnswers: 20, incorrectAnswers: 2, timeTaken: 55 },
      };

      const parsed = parsePracticeSession(row);
      expect(parsed.menuType).toBe('coordinate_quiz');
      expect(isTypedSession(parsed)).toBe(true);
    });

    it('parses legal_moves as typed session', () => {
      const row = {
        ...baseRow,
        menuType: 'legal_moves',
        settings: { timeLimit: 90, selectedPiece: 'knight', mistakeAllowance: null },
        result: { correctAnswers: 15, incorrectAnswers: 1, timeTaken: 80 },
      };

      const parsed = parsePracticeSession(row);
      expect(parsed.menuType).toBe('legal_moves');
      expect(isTypedSession(parsed)).toBe(true);
    });

    it('parses square_colors as typed session', () => {
      const row = {
        ...baseRow,
        menuType: 'square_colors',
        settings: { timeLimit: 60, mistakeAllowance: 5 },
        result: { correctAnswers: 30, incorrectAnswers: 0, timeTaken: 45 },
      };

      const parsed = parsePracticeSession(row);
      expect(parsed.menuType).toBe('square_colors');
      expect(isTypedSession(parsed)).toBe(true);
    });
  });

  describe('unknown menuTypes produce UnknownPracticeSession', () => {
    it('parses unknown menuType as untyped session', () => {
      const row = {
        ...baseRow,
        menuType: 'diagonal_quiz',
        settings: { someCustomSetting: true },
        result: { someCustomResult: 42 },
      };

      const parsed = parsePracticeSession(row);
      expect(parsed.menuType).toBe('diagonal_quiz');
      expect(isTypedSession(parsed)).toBe(false);
    });

    it('handles null settings and result gracefully', () => {
      const row = {
        ...baseRow,
        menuType: 'knight_tour',
        settings: null,
        result: null,
      };

      const parsed = parsePracticeSession(row);
      expect(parsed.menuType).toBe('knight_tour');
      expect(isTypedSession(parsed)).toBe(false);
      // null settings/result get replaced with empty objects
      expect(parsed.settings).toEqual({});
      expect(parsed.result).toEqual({});
    });
  });

  it('preserves base fields (id, startedAt)', () => {
    const row = {
      ...baseRow,
      menuType: 'coordinate_quiz',
      settings: { timeLimit: 60, boardOrientation: 'white', mistakeAllowance: 3 },
      result: { correctAnswers: 10, incorrectAnswers: 0, timeTaken: 30 },
    };

    const parsed = parsePracticeSession(row);
    expect(parsed.id).toBe('session-1');
    expect(parsed.startedAt).toEqual(new Date('2025-06-01T10:00:00Z'));
  });

  it('handles null startedAt', () => {
    const row = {
      id: 'session-2',
      startedAt: null,
      menuType: 'square_colors',
      settings: { timeLimit: 60, mistakeAllowance: null },
      result: { correctAnswers: 5, incorrectAnswers: 1, timeTaken: 10 },
    };

    const parsed = parsePracticeSession(row);
    expect(parsed.startedAt).toBeNull();
  });
});

describe('isTypedSession', () => {
  it('returns true for coordinate_quiz', () => {
    const session: PracticeSessionRow = {
      id: '1',
      startedAt: null,
      menuType: 'coordinate_quiz',
      settings: { timeLimit: 60, boardOrientation: 'white', mistakeAllowance: null },
      result: { correctAnswers: 10, incorrectAnswers: 0, timeTaken: 30 },
    };
    expect(isTypedSession(session)).toBe(true);
  });

  it('returns true for legal_moves', () => {
    const session: PracticeSessionRow = {
      id: '2',
      startedAt: null,
      menuType: 'legal_moves',
      settings: { timeLimit: 60, selectedPiece: 'knight', mistakeAllowance: null },
      result: { correctAnswers: 5, incorrectAnswers: 2, timeTaken: 40 },
    };
    expect(isTypedSession(session)).toBe(true);
  });

  it('returns true for square_colors', () => {
    const session: PracticeSessionRow = {
      id: '3',
      startedAt: null,
      menuType: 'square_colors',
      settings: { timeLimit: 60, mistakeAllowance: 3 },
      result: { correctAnswers: 20, incorrectAnswers: 1, timeTaken: 50 },
    };
    expect(isTypedSession(session)).toBe(true);
  });

  it('returns false for unknown menuType', () => {
    const session: PracticeSessionRow = {
      id: '4',
      startedAt: null,
      menuType: 'diagonal_quiz',
      settings: {},
      result: {},
    };
    expect(isTypedSession(session)).toBe(false);
  });

  it('returns false for another unknown menuType', () => {
    const session: PracticeSessionRow = {
      id: '5',
      startedAt: null,
      menuType: 'position_memory',
      settings: {},
      result: {},
    };
    expect(isTypedSession(session)).toBe(false);
  });
});

describe('getSessionScoreFields', () => {
  it('extracts score fields from coordinate_quiz session', () => {
    const session: PracticeSessionRow = {
      id: '1',
      startedAt: null,
      menuType: 'coordinate_quiz',
      settings: { timeLimit: 60, boardOrientation: 'white', mistakeAllowance: 3 },
      result: { correctAnswers: 25, incorrectAnswers: 5, timeTaken: 55 },
    };

    const fields = getSessionScoreFields(session);
    expect(fields).toEqual({
      correctAnswers: 25,
      incorrectAnswers: 5,
      mistakeAllowance: 3,
    });
  });

  it('extracts score fields from legal_moves session', () => {
    const session: PracticeSessionRow = {
      id: '2',
      startedAt: null,
      menuType: 'legal_moves',
      settings: { timeLimit: 90, selectedPiece: 'knight', mistakeAllowance: null },
      result: { correctAnswers: 15, incorrectAnswers: 2, timeTaken: 80 },
    };

    const fields = getSessionScoreFields(session);
    expect(fields).toEqual({
      correctAnswers: 15,
      incorrectAnswers: 2,
      mistakeAllowance: null,
    });
  });

  it('extracts score fields from square_colors session', () => {
    const session: PracticeSessionRow = {
      id: '3',
      startedAt: null,
      menuType: 'square_colors',
      settings: { timeLimit: 60, mistakeAllowance: 5 },
      result: { correctAnswers: 30, incorrectAnswers: 0, timeTaken: 45 },
    };

    const fields = getSessionScoreFields(session);
    expect(fields).toEqual({
      correctAnswers: 30,
      incorrectAnswers: 0,
      mistakeAllowance: 5,
    });
  });

  it('returns score fields from unknown session with compatible result shape', () => {
    const session: PracticeSessionRow = {
      id: '4',
      startedAt: null,
      menuType: 'diagonal_quiz',
      settings: { mistakeAllowance: 2 },
      result: { correctAnswers: 10, incorrectAnswers: 3 },
    };

    const fields = getSessionScoreFields(session);
    expect(fields).toEqual({
      correctAnswers: 10,
      incorrectAnswers: 3,
      mistakeAllowance: 2,
    });
  });

  it('returns null for unknown session without correctAnswers', () => {
    const session: PracticeSessionRow = {
      id: '5',
      startedAt: null,
      menuType: 'knight_tour',
      settings: {},
      result: { score: 100 },
    };

    const fields = getSessionScoreFields(session);
    expect(fields).toBeNull();
  });

  it('returns null for unknown session without incorrectAnswers', () => {
    const session: PracticeSessionRow = {
      id: '6',
      startedAt: null,
      menuType: 'knight_tour',
      settings: {},
      result: { correctAnswers: 10 },
    };

    const fields = getSessionScoreFields(session);
    expect(fields).toBeNull();
  });

  it('returns null mistakeAllowance for unknown session without mistakeAllowance in settings', () => {
    const session: PracticeSessionRow = {
      id: '7',
      startedAt: null,
      menuType: 'diagonal_quiz',
      settings: {},
      result: { correctAnswers: 10, incorrectAnswers: 2 },
    };

    const fields = getSessionScoreFields(session);
    expect(fields).toEqual({
      correctAnswers: 10,
      incorrectAnswers: 2,
      mistakeAllowance: null,
    });
  });

  it('returns null mistakeAllowance when settings.mistakeAllowance is not a number', () => {
    const session: PracticeSessionRow = {
      id: '8',
      startedAt: null,
      menuType: 'diagonal_quiz',
      settings: { mistakeAllowance: 'unlimited' },
      result: { correctAnswers: 5, incorrectAnswers: 0 },
    };

    const fields = getSessionScoreFields(session);
    expect(fields).toEqual({
      correctAnswers: 5,
      incorrectAnswers: 0,
      mistakeAllowance: null,
    });
  });
});
