// @vitest-environment jsdom
import React from 'react';

import * as matchers from '@testing-library/jest-dom/matchers';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GamePreferencesProvider, useGamePreferences } from './GamePreferencesContext';

expect.extend(matchers);

const STORAGE_KEY = 'blindfold-chess-game-preferences';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(GamePreferencesProvider, null, children);
}

describe('GamePreferencesContext - peekMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  describe('default value', () => {
    it('defaults peekMode to "modal"', () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });
      expect(result.current.preferences.peekMode).toBe('modal');
    });
  });

  describe('updatePreferences', () => {
    it('updates peekMode to "inline"', () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      act(() => {
        result.current.updatePreferences({ peekMode: 'inline' });
      });

      expect(result.current.preferences.peekMode).toBe('inline');
    });

    it('updates peekMode back to "modal"', () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      act(() => {
        result.current.updatePreferences({ peekMode: 'inline' });
      });
      act(() => {
        result.current.updatePreferences({ peekMode: 'modal' });
      });

      expect(result.current.preferences.peekMode).toBe('modal');
    });

    it('does not affect other preferences when updating peekMode', () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      const showCoordinatesBefore = result.current.preferences.showCoordinates;
      const moveInputModeBefore = result.current.preferences.moveInputMode;

      act(() => {
        result.current.updatePreferences({ peekMode: 'inline' });
      });

      expect(result.current.preferences.showCoordinates).toBe(showCoordinatesBefore);
      expect(result.current.preferences.moveInputMode).toBe(moveInputModeBefore);
    });
  });

  describe('persistence via localStorage', () => {
    it('persists peekMode to localStorage after update', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      // Wait for initial load
      await act(async () => {});

      act(() => {
        result.current.updatePreferences({ peekMode: 'inline' });
      });

      // Wait for effect to persist
      await act(async () => {});

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored.peekMode).toBe('inline');
    });

    it('loads peekMode from localStorage on mount', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ peekMode: 'inline' }));

      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      // Wait for useEffect to run
      await act(async () => {});

      expect(result.current.preferences.peekMode).toBe('inline');
    });

    it('falls back to default when localStorage has invalid peekMode', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ peekMode: 'invalid-value' }));

      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      expect(result.current.preferences.peekMode).toBe('modal');
    });

    it('falls back to default when localStorage has non-string peekMode', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ peekMode: 42 }));

      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      expect(result.current.preferences.peekMode).toBe('modal');
    });

    it('falls back to default when localStorage has no peekMode', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ showCoordinates: false }));

      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      expect(result.current.preferences.peekMode).toBe('modal');
    });
  });

  describe('resetPreferences', () => {
    it('resets peekMode to default "modal"', () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      act(() => {
        result.current.updatePreferences({ peekMode: 'inline' });
      });
      expect(result.current.preferences.peekMode).toBe('inline');

      act(() => {
        result.current.resetPreferences();
      });
      expect(result.current.preferences.peekMode).toBe('modal');
    });
  });
});
