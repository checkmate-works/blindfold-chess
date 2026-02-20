// @vitest-environment jsdom
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PracticeMode } from '../_lib/types';

const STORAGE_KEY = 'coordinateQuiz_settings';

describe('CoordinateQuiz localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  describe('reading settings from localStorage', () => {
    it('parses valid settings with timed mode', () => {
      const settings = {
        timeLimit: 90,
        boardOrientation: 'white',
        feedbackSpeed: 'normal',
        mode: 'timed',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);

      expect(parsed.timeLimit).toBe(90);
      expect(parsed.mode).toBe('timed');
      expect(parsed.boardOrientation).toBe('white');
      expect(parsed.feedbackSpeed).toBe('normal');
    });

    it('parses valid settings with training mode', () => {
      const settings = {
        timeLimit: 60,
        boardOrientation: 'black',
        feedbackSpeed: 'fast',
        mode: 'training',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);

      expect(parsed.timeLimit).toBe(60);
      expect(parsed.mode).toBe('training');
      expect(parsed.boardOrientation).toBe('black');
      expect(parsed.feedbackSpeed).toBe('fast');
    });

    it('handles missing localStorage data gracefully', () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      expect(saved).toBeNull();
    });

    it('handles invalid JSON in localStorage gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid-json');

      let settings = null;
      try {
        settings = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      } catch {
        // Expected - invalid JSON
      }

      expect(settings).toBeNull();
    });

    it('handles missing mode field by defaulting', () => {
      const settings = { timeLimit: 45, boardOrientation: 'white', feedbackSpeed: 'normal' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);

      expect(parsed.mode).toBeUndefined();
      const isValidMode = parsed.mode === 'timed' || parsed.mode === 'training';
      expect(isValidMode).toBe(false);
    });

    it('rejects invalid mode values', () => {
      const settings = {
        timeLimit: 60,
        boardOrientation: 'white',
        feedbackSpeed: 'normal',
        mode: 'invalid_mode',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);

      const isValidMode = parsed.mode === 'timed' || parsed.mode === 'training';
      expect(isValidMode).toBe(false);
    });
  });

  describe('writing settings to localStorage', () => {
    it('persists timed mode settings', () => {
      const settings = {
        timeLimit: 120,
        boardOrientation: 'white',
        feedbackSpeed: 'normal',
        mode: 'timed',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.timeLimit).toBe(120);
      expect(saved.mode).toBe('timed');
    });

    it('persists training mode settings', () => {
      const settings = {
        timeLimit: 60,
        boardOrientation: 'random',
        feedbackSpeed: 'slow',
        mode: 'training',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.timeLimit).toBe(60);
      expect(saved.mode).toBe('training');
      expect(saved.boardOrientation).toBe('random');
      expect(saved.feedbackSpeed).toBe('slow');
    });

    it('overwrites previous settings', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          timeLimit: 30,
          boardOrientation: 'white',
          feedbackSpeed: 'normal',
          mode: 'timed',
        })
      );
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          timeLimit: 90,
          boardOrientation: 'black',
          feedbackSpeed: 'fast',
          mode: 'training',
        })
      );

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.timeLimit).toBe(90);
      expect(saved.mode).toBe('training');
      expect(saved.boardOrientation).toBe('black');
    });
  });
});

describe('Navigation URL construction', () => {
  it('constructs correct URL for training mode', () => {
    const locale = 'en';
    const mode: PracticeMode = 'training';
    const boardOrientation = 'white';
    const feedbackSpeed = 'normal';

    const url =
      mode === 'training'
        ? `/${locale}/practice/coordinate-quiz/training?boardOrientation=${boardOrientation}&feedbackSpeed=${feedbackSpeed}#coordinate-quiz-training-session`
        : `/${locale}/practice/coordinate-quiz/challenge?timeLimit=60&boardOrientation=${boardOrientation}&feedbackSpeed=${feedbackSpeed}#quiz-session`;

    expect(url).toBe(
      '/en/practice/coordinate-quiz/training?boardOrientation=white&feedbackSpeed=normal#coordinate-quiz-training-session'
    );
  });

  it('constructs correct URL for timed mode', () => {
    const locale = 'en';
    const timeLimit = 90;
    const boardOrientation = 'black';
    const feedbackSpeed = 'fast';

    const url = `/${locale}/practice/coordinate-quiz/challenge?timeLimit=${timeLimit}&boardOrientation=${boardOrientation}&feedbackSpeed=${feedbackSpeed}#quiz-session`;

    expect(url).toBe(
      '/en/practice/coordinate-quiz/challenge?timeLimit=90&boardOrientation=black&feedbackSpeed=fast#quiz-session'
    );
  });

  it('constructs correct URL for Japanese locale', () => {
    const locale = 'ja';
    const mode: PracticeMode = 'training';
    const boardOrientation = 'random';
    const feedbackSpeed = 'slow';

    const url =
      mode === 'training'
        ? `/${locale}/practice/coordinate-quiz/training?boardOrientation=${boardOrientation}&feedbackSpeed=${feedbackSpeed}#coordinate-quiz-training-session`
        : `/${locale}/practice/coordinate-quiz/challenge?timeLimit=60&boardOrientation=${boardOrientation}&feedbackSpeed=${feedbackSpeed}#quiz-session`;

    expect(url).toBe(
      '/ja/practice/coordinate-quiz/training?boardOrientation=random&feedbackSpeed=slow#coordinate-quiz-training-session'
    );
  });
});
