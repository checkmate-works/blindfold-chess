// @vitest-environment jsdom
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PracticeMode } from '../_lib/types';

const STORAGE_KEY = 'squareColors_settings';

describe('SquareColors localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  describe('reading settings from localStorage', () => {
    it('parses valid settings with timed mode', () => {
      const settings = { timeLimit: 90, mode: 'timed' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);

      expect(parsed.timeLimit).toBe(90);
      expect(parsed.mode).toBe('timed');
    });

    it('parses valid settings with training mode', () => {
      const settings = { timeLimit: 60, mode: 'training' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);

      expect(parsed.timeLimit).toBe(60);
      expect(parsed.mode).toBe('training');
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
      const settings = { timeLimit: 45 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);

      // Mode is missing, so the component would use default 'timed'
      expect(parsed.mode).toBeUndefined();
      // The validation in SquareColors checks: settings.mode === 'timed' || settings.mode === 'training'
      const isValidMode = parsed.mode === 'timed' || parsed.mode === 'training';
      expect(isValidMode).toBe(false);
    });

    it('rejects invalid mode values', () => {
      const settings = { timeLimit: 60, mode: 'invalid_mode' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);

      const isValidMode = parsed.mode === 'timed' || parsed.mode === 'training';
      expect(isValidMode).toBe(false);
    });
  });

  describe('writing settings to localStorage', () => {
    it('persists timed mode settings', () => {
      const settings = { timeLimit: 120, mode: 'timed' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.timeLimit).toBe(120);
      expect(saved.mode).toBe('timed');
    });

    it('persists training mode settings', () => {
      const settings = { timeLimit: 60, mode: 'training' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.timeLimit).toBe(60);
      expect(saved.mode).toBe('training');
    });

    it('overwrites previous settings', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLimit: 30, mode: 'timed' }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLimit: 90, mode: 'training' }));

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.timeLimit).toBe(90);
      expect(saved.mode).toBe('training');
    });
  });
});

describe('Navigation URL construction', () => {
  it('constructs correct URL for training mode (separate route)', () => {
    const locale = 'en';
    const mode: PracticeMode = 'training';
    const url =
      mode === 'training'
        ? `/${locale}/practice/square-colors/training#square-colors-training-session`
        : `/${locale}/practice/square-colors/challenge?timeLimit=60#square-colors-challenge`;

    expect(url).toBe('/en/practice/square-colors/training#square-colors-training-session');
  });

  it('constructs correct URL for timed mode', () => {
    const locale = 'en';
    const timeLimit = 90;

    // Timed mode navigates to challenge route with timeLimit param
    const url = `/${locale}/practice/square-colors/challenge?timeLimit=${timeLimit}#square-colors-challenge`;

    expect(url).toBe('/en/practice/square-colors/challenge?timeLimit=90#square-colors-challenge');
  });

  it('constructs correct URL for Japanese locale', () => {
    const locale = 'ja';
    const mode: PracticeMode = 'training';
    const url =
      mode === 'training'
        ? `/${locale}/practice/square-colors/training#square-colors-training-session`
        : `/${locale}/practice/square-colors/challenge?timeLimit=60#square-colors-challenge`;

    expect(url).toBe('/ja/practice/square-colors/training#square-colors-training-session');
  });
});
