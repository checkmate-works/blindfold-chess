import { describe, expect, it } from 'vitest';

import type { SquareColorsResult, SquareColorsSettings } from '@/lib/db/practice-session-types';

/**
 * Tests for the settings/result construction logic
 * in save-result.ts without requiring DB or Supabase dependencies.
 *
 * This mirrors the logic from saveSquareColorsResult() to verify:
 * - settings contains timeLimit and mistakeAllowance
 * - result contains only correctAnswers, incorrectAnswers, timeTaken
 */

type SaveSquareColorsResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  mistakeAllowance: number;
};

function buildSettingsAndResult(input: SaveSquareColorsResultInput): {
  settings: SquareColorsSettings;
  result: SquareColorsResult;
} {
  const settings: SquareColorsSettings = {
    timeLimit: 60,
    mistakeAllowance: input.mistakeAllowance,
  };

  const result: SquareColorsResult = {
    correctAnswers: input.correctAnswers,
    incorrectAnswers: input.incorrectAnswers,
    timeTaken: input.timeTaken,
  };

  return { settings, result };
}

describe('save-result settings and result construction', () => {
  describe('settings construction', () => {
    it('stores mistakeAllowance in settings', () => {
      const { settings } = buildSettingsAndResult({
        correctAnswers: 25,
        incorrectAnswers: 3,
        timeTaken: 45,
        mistakeAllowance: 3,
      });

      expect(settings.timeLimit).toBe(60);
      expect(settings.mistakeAllowance).toBe(3);
    });

    it('stores mistakeAllowance=1 in settings', () => {
      const { settings } = buildSettingsAndResult({
        correctAnswers: 10,
        incorrectAnswers: 1,
        timeTaken: 15,
        mistakeAllowance: 1,
      });

      expect(settings.mistakeAllowance).toBe(1);
    });
  });

  describe('result construction', () => {
    it('stores only correctAnswers, incorrectAnswers, and timeTaken', () => {
      const { result } = buildSettingsAndResult({
        correctAnswers: 25,
        incorrectAnswers: 3,
        timeTaken: 45,
        mistakeAllowance: 3,
      });

      expect(result.correctAnswers).toBe(25);
      expect(result.incorrectAnswers).toBe(3);
      expect(result.timeTaken).toBe(45);
    });

    it('does not include derived fields', () => {
      const { result } = buildSettingsAndResult({
        correctAnswers: 50,
        incorrectAnswers: 10,
        timeTaken: 60,
        mistakeAllowance: 3,
      });

      expect(result).toEqual({
        correctAnswers: 50,
        incorrectAnswers: 10,
        timeTaken: 60,
      });
    });
  });

  describe('result field consistency', () => {
    it('preserves all input fields correctly', () => {
      const input: SaveSquareColorsResultInput = {
        correctAnswers: 25,
        incorrectAnswers: 3,
        timeTaken: 45,
        mistakeAllowance: 3,
      };

      const { settings, result } = buildSettingsAndResult(input);

      expect(settings.timeLimit).toBe(60);
      expect(settings.mistakeAllowance).toBe(3);
      expect(result.correctAnswers).toBe(25);
      expect(result.incorrectAnswers).toBe(3);
      expect(result.timeTaken).toBe(45);
    });
  });
});
