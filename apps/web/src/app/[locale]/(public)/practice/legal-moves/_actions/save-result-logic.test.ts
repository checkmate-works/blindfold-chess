import { describe, expect, it } from 'vitest';

import { buildLegalMovesData } from './save-result-logic';
import type { SaveLegalMovesResultInput } from './save-result-logic';

/**
 * Tests for buildLegalMovesData() — the pure logic that constructs
 * settings/result objects for legal_moves practice sessions.
 *
 * Covers:
 * - menuType is always 'legal_moves'
 * - settings shape: timeLimit, selectedPiece, mistakeAllowance
 * - result shape: correctAnswers, incorrectAnswers, timeTaken
 * - Challenge-mode single-piece selection (e.g., selectedPiece: 'king')
 * - Challenge-mode random selection (selectedPiece: 'random')
 * - Training-mode single-select
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<SaveLegalMovesResultInput> = {}): SaveLegalMovesResultInput {
  return {
    correctAnswers: 10,
    incorrectAnswers: 2,
    timeTaken: 45,
    timeLimit: 60,
    selectedPiece: 'random',
    mistakeAllowance: 3,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildLegalMovesData', () => {
  describe('menuType', () => {
    it('is always legal_moves', () => {
      const { menuType } = buildLegalMovesData(makeInput());
      expect(menuType).toBe('legal_moves');
    });
  });

  describe('settings construction', () => {
    it('stores timeLimit from input', () => {
      const { settings } = buildLegalMovesData(makeInput({ timeLimit: 90 }));
      expect(settings.timeLimit).toBe(90);
    });

    it('stores selectedPiece from input', () => {
      const { settings } = buildLegalMovesData(makeInput({ selectedPiece: 'knight' }));
      expect(settings.selectedPiece).toBe('knight');
    });

    it('stores mistakeAllowance from input', () => {
      const { settings } = buildLegalMovesData(makeInput({ mistakeAllowance: 5 }));
      expect(settings.mistakeAllowance).toBe(5);
    });

    it('contains only expected keys', () => {
      const { settings } = buildLegalMovesData(makeInput());
      expect(Object.keys(settings).sort()).toEqual([
        'mistakeAllowance',
        'selectedPiece',
        'timeLimit',
      ]);
    });
  });

  describe('result construction', () => {
    it('stores correctAnswers, incorrectAnswers, and timeTaken', () => {
      const { result } = buildLegalMovesData(
        makeInput({ correctAnswers: 25, incorrectAnswers: 3, timeTaken: 55 })
      );

      expect(result.correctAnswers).toBe(25);
      expect(result.incorrectAnswers).toBe(3);
      expect(result.timeTaken).toBe(55);
    });

    it('does not include settings fields in result', () => {
      const { result } = buildLegalMovesData(makeInput());

      expect(result).not.toHaveProperty('timeLimit');
      expect(result).not.toHaveProperty('selectedPiece');
      expect(result).not.toHaveProperty('mistakeAllowance');
    });

    it('contains only expected keys', () => {
      const { result } = buildLegalMovesData(makeInput());
      expect(Object.keys(result).sort()).toEqual([
        'correctAnswers',
        'incorrectAnswers',
        'timeTaken',
      ]);
    });

    it('handles zero answers correctly', () => {
      const { result } = buildLegalMovesData(
        makeInput({ correctAnswers: 0, incorrectAnswers: 0, timeTaken: 3 })
      );

      expect(result.correctAnswers).toBe(0);
      expect(result.incorrectAnswers).toBe(0);
      expect(result.timeTaken).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Challenge mode: single-piece selection
  // ---------------------------------------------------------------------------
  describe('challenge mode — single piece selection', () => {
    it.each(['king', 'queen', 'rook', 'bishop', 'knight'] as const)(
      'stores single piece "%s" correctly',
      (piece) => {
        const { settings } = buildLegalMovesData(makeInput({ selectedPiece: piece }));
        expect(settings.selectedPiece).toBe(piece);
      }
    );
  });

  // ---------------------------------------------------------------------------
  // Challenge mode: random selection
  // ---------------------------------------------------------------------------
  describe('challenge mode — random selection', () => {
    it('stores "random" when random is selected', () => {
      const { settings } = buildLegalMovesData(makeInput({ selectedPiece: 'random' }));
      expect(settings.selectedPiece).toBe('random');
    });
  });

  // ---------------------------------------------------------------------------
  // Full round-trip consistency
  // ---------------------------------------------------------------------------
  describe('end-to-end consistency', () => {
    it('preserves all input fields correctly for a single-piece challenge', () => {
      const input = makeInput({
        correctAnswers: 30,
        incorrectAnswers: 3,
        timeTaken: 58,
        timeLimit: 60,
        selectedPiece: 'rook',
        mistakeAllowance: 3,
      });

      const { menuType, settings, result } = buildLegalMovesData(input);

      expect(menuType).toBe('legal_moves');
      expect(settings.timeLimit).toBe(60);
      expect(settings.selectedPiece).toBe('rook');
      expect(settings.mistakeAllowance).toBe(3);
      expect(result.correctAnswers).toBe(30);
      expect(result.incorrectAnswers).toBe(3);
      expect(result.timeTaken).toBe(58);
    });

    it('preserves all input fields correctly for a random challenge', () => {
      const input = makeInput({
        correctAnswers: 42,
        incorrectAnswers: 3,
        timeTaken: 60,
        timeLimit: 60,
        selectedPiece: 'random',
        mistakeAllowance: 3,
      });

      const { menuType, settings, result } = buildLegalMovesData(input);

      expect(menuType).toBe('legal_moves');
      expect(settings.timeLimit).toBe(60);
      expect(settings.selectedPiece).toBe('random');
      expect(settings.mistakeAllowance).toBe(3);
      expect(result.correctAnswers).toBe(42);
      expect(result.incorrectAnswers).toBe(3);
      expect(result.timeTaken).toBe(60);
    });
  });
});
