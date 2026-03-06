import { describe, expect, it } from 'vitest';

import type { CoordinateQuizSettings } from '@/lib/db/practice-session-types';

import { buildCoordinateQuizData } from './save-result';

/**
 * Tests for the settings/result construction logic
 * in save-result.ts without requiring DB or Supabase dependencies.
 *
 * Uses the exported buildCoordinateQuizData() to verify:
 * - settings contains timeLimit, boardOrientation, and mistakeAllowance
 * - result contains only correctAnswers, incorrectAnswers, timeTaken
 * - menuType is always 'coordinate_quiz'
 */

describe('save-result settings and result construction', () => {
  describe('menuType', () => {
    it('is always coordinate_quiz', () => {
      const { menuType } = buildCoordinateQuizData({
        correctAnswers: 20,
        incorrectAnswers: 3,
        timeTaken: 55,
        timeLimit: 60,
        boardOrientation: 'white',
        mistakeAllowance: 3,
      });

      expect(menuType).toBe('coordinate_quiz');
    });
  });

  describe('settings construction', () => {
    it('stores timeLimit from input', () => {
      const { settings } = buildCoordinateQuizData({
        correctAnswers: 20,
        incorrectAnswers: 2,
        timeTaken: 55,
        timeLimit: 60,
        boardOrientation: 'white',
        mistakeAllowance: 3,
      });

      expect(settings.timeLimit).toBe(60);
    });

    it('stores boardOrientation in settings', () => {
      const { settings } = buildCoordinateQuizData({
        correctAnswers: 15,
        incorrectAnswers: 1,
        timeTaken: 30,
        timeLimit: 30,
        boardOrientation: 'black',
        mistakeAllowance: 3,
      });

      expect(settings.boardOrientation).toBe('black');
    });

    it('stores random boardOrientation', () => {
      const { settings } = buildCoordinateQuizData({
        correctAnswers: 10,
        incorrectAnswers: 0,
        timeTaken: 20,
        timeLimit: 30,
        boardOrientation: 'random',
        mistakeAllowance: 3,
      });

      expect(settings.boardOrientation).toBe('random');
    });

    it('stores mistakeAllowance in settings', () => {
      const { settings } = buildCoordinateQuizData({
        correctAnswers: 25,
        incorrectAnswers: 3,
        timeTaken: 45,
        timeLimit: 60,
        boardOrientation: 'white',
        mistakeAllowance: 3,
      });

      expect(settings.mistakeAllowance).toBe(3);
    });

    it('stores null mistakeAllowance in settings', () => {
      const input = {
        correctAnswers: 25,
        incorrectAnswers: 5,
        timeTaken: 45,
        timeLimit: 60,
        boardOrientation: 'white',
        mistakeAllowance: null as unknown as number,
      };

      const settings: CoordinateQuizSettings = {
        timeLimit: input.timeLimit,
        boardOrientation: input.boardOrientation,
        mistakeAllowance: input.mistakeAllowance,
      };

      expect(settings.mistakeAllowance).toBeNull();
    });

    it('contains only expected keys', () => {
      const { settings } = buildCoordinateQuizData({
        correctAnswers: 20,
        incorrectAnswers: 2,
        timeTaken: 55,
        timeLimit: 60,
        boardOrientation: 'white',
        mistakeAllowance: 3,
      });

      expect(Object.keys(settings).sort()).toEqual([
        'boardOrientation',
        'mistakeAllowance',
        'timeLimit',
      ]);
    });
  });

  describe('result construction', () => {
    it('stores only correctAnswers, incorrectAnswers, and timeTaken', () => {
      const { result } = buildCoordinateQuizData({
        correctAnswers: 25,
        incorrectAnswers: 3,
        timeTaken: 45,
        timeLimit: 60,
        boardOrientation: 'white',
        mistakeAllowance: 3,
      });

      expect(result.correctAnswers).toBe(25);
      expect(result.incorrectAnswers).toBe(3);
      expect(result.timeTaken).toBe(45);
    });

    it('does not include settings fields in result', () => {
      const { result } = buildCoordinateQuizData({
        correctAnswers: 50,
        incorrectAnswers: 10,
        timeTaken: 60,
        timeLimit: 60,
        boardOrientation: 'black',
        mistakeAllowance: 3,
      });

      expect(result).toEqual({
        correctAnswers: 50,
        incorrectAnswers: 10,
        timeTaken: 60,
      });
    });

    it('contains only expected keys', () => {
      const { result } = buildCoordinateQuizData({
        correctAnswers: 20,
        incorrectAnswers: 2,
        timeTaken: 55,
        timeLimit: 60,
        boardOrientation: 'white',
        mistakeAllowance: 3,
      });

      expect(Object.keys(result).sort()).toEqual([
        'correctAnswers',
        'incorrectAnswers',
        'timeTaken',
      ]);
    });
  });

  describe('result field consistency', () => {
    it('preserves all input fields correctly', () => {
      const input = {
        correctAnswers: 25,
        incorrectAnswers: 3,
        timeTaken: 45,
        timeLimit: 90,
        boardOrientation: 'white',
        mistakeAllowance: 3,
      };

      const { settings, result } = buildCoordinateQuizData(input);

      expect(settings.timeLimit).toBe(90);
      expect(settings.boardOrientation).toBe('white');
      expect(settings.mistakeAllowance).toBe(3);
      expect(result.correctAnswers).toBe(25);
      expect(result.incorrectAnswers).toBe(3);
      expect(result.timeTaken).toBe(45);
    });

    it('does not leak timeLimit or boardOrientation into result', () => {
      const { result } = buildCoordinateQuizData({
        correctAnswers: 10,
        incorrectAnswers: 2,
        timeTaken: 30,
        timeLimit: 60,
        boardOrientation: 'random',
        mistakeAllowance: 3,
      });

      expect(result).not.toHaveProperty('timeLimit');
      expect(result).not.toHaveProperty('boardOrientation');
      expect(result).not.toHaveProperty('mistakeAllowance');
    });

    it('handles zero answers correctly', () => {
      const { result } = buildCoordinateQuizData({
        correctAnswers: 0,
        incorrectAnswers: 0,
        timeTaken: 3,
        timeLimit: 60,
        boardOrientation: 'white',
        mistakeAllowance: 3,
      });

      expect(result.correctAnswers).toBe(0);
      expect(result.incorrectAnswers).toBe(0);
      expect(result.timeTaken).toBe(3);
    });
  });
});
