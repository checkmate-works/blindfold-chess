// @vitest-environment jsdom
import React from 'react';

import * as matchers from '@testing-library/jest-dom/matchers';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MOVE_INPUT_COOKIE_NAME } from '@/lib/games/move-input-cookie';
import { PEEK_COOKIE_NAME } from '@/lib/games/peek-cookie';

import { GamePreferencesProvider, useGamePreferences } from './GamePreferencesContext';

expect.extend(matchers);

const STORAGE_KEY = 'blindfold-chess-game-preferences';

/**
 * Read the current value of the move-input mirror cookie, or `null` if not
 * present. jsdom's `document.cookie` returns all cookies joined by `; ` with
 * no attributes, so we only need a simple lookup.
 */
function readMoveInputCookie(): string | null {
  const entry = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${MOVE_INPUT_COOKIE_NAME}=`));
  return entry ? entry.slice(MOVE_INPUT_COOKIE_NAME.length + 1) : null;
}

/**
 * Expire the mirror cookie. jsdom keeps cookies across tests within the same
 * worker, so we clear it between test cases to avoid leakage.
 */
function clearMoveInputCookie(): void {
  document.cookie = `${MOVE_INPUT_COOKIE_NAME}=; Path=/; Max-Age=0`;
}

/**
 * Read the current value of the board-peek mirror cookie, or `null` if not
 * present. Symmetric with `readMoveInputCookie` above.
 */
function readPeekCookie(): string | null {
  const entry = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PEEK_COOKIE_NAME}=`));
  return entry ? entry.slice(PEEK_COOKIE_NAME.length + 1) : null;
}

/**
 * Expire the peek mirror cookie between tests.
 */
function clearPeekCookie(): void {
  document.cookie = `${PEEK_COOKIE_NAME}=; Path=/; Max-Age=0`;
}

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

  describe('cross-tab sync via storage event', () => {
    it('syncs preferences when storage event fires from another tab', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      // Wait for initial load
      await act(async () => {});

      expect(result.current.preferences.peekMode).toBe('modal');

      // Simulate a storage event from another tab
      await act(async () => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: JSON.stringify({ peekMode: 'inline', showCoordinates: false }),
          })
        );
      });

      expect(result.current.preferences.peekMode).toBe('inline');
      expect(result.current.preferences.showCoordinates).toBe(false);
    });

    it('ignores storage events for other keys', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      await act(async () => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'some-other-key',
            newValue: JSON.stringify({ peekMode: 'inline' }),
          })
        );
      });

      expect(result.current.preferences.peekMode).toBe('modal');
    });

    it('ignores storage events with null newValue', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      await act(async () => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: null,
          })
        );
      });

      expect(result.current.preferences.peekMode).toBe('modal');
    });

    it('ignores storage events with malformed JSON', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      await act(async () => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: 'not-valid-json',
          })
        );
      });

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

/**
 * Move-input cookie mirror behavior. These tests pin the contract that
 * `GamePreferencesContext` is the single writer for the `bfc_move_input_pref`
 * cookie and that mode-related updates flush synchronously (i.e. before the
 * originating call returns), so a user who toggles mode and immediately
 * navigates does not race a post-state-update effect and land on the server
 * with a stale cookie.
 *
 * Note: jsdom exposes `document.cookie` as a real accessor, so we assert on
 * it directly. `IS_LOCAL_DEV` evaluates to `false` in the test environment,
 * so the cookie write emits `; Secure` — jsdom tolerates this over the
 * default `http://localhost` URL (see `move-input-cookie` probe coverage).
 */
describe('GamePreferencesContext - moveInput cookie mirror', () => {
  beforeEach(() => {
    localStorage.clear();
    clearMoveInputCookie();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    clearMoveInputCookie();
  });

  describe('initial load', () => {
    it('writes the default hint to the cookie when no preferences are persisted', async () => {
      renderHook(() => useGamePreferences(), { wrapper });

      // Initial load is inside a `useEffect` — flush it.
      await act(async () => {});

      expect(readMoveInputCookie()).toBe('button|button');
    });

    it('writes the loaded mode to the cookie when preferences are persisted', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          moveInputMode: 'text',
          enabledMoveInputModes: ['text', 'button'],
        })
      );

      renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      expect(readMoveInputCookie()).toBe('text|text,button');
    });

    it('reconciles mode ∉ enabledModes when writing the initial cookie', async () => {
      // Matches the reconciliation path in the provider: when the persisted
      // `moveInputMode` isn't in `enabledMoveInputModes`, the provider snaps
      // to the first enabled entry and that reconciled state is what gets
      // mirrored into the cookie.
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          moveInputMode: 'text',
          enabledMoveInputModes: ['button'],
        })
      );

      renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      expect(readMoveInputCookie()).toBe('button|button');
    });
  });

  describe('updatePreferences', () => {
    it('writes the cookie synchronously inside the updatePreferences call when moveInputMode changes', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      // Wait for initial load so the "before" cookie state is stable.
      await act(async () => {});
      expect(readMoveInputCookie()).toBe('button|button');

      // Synchronous check: observe `document.cookie` immediately after
      // `updatePreferences` returns, without awaiting any effects. If the
      // write had been deferred to a post-state-update `useEffect`, the
      // cookie would still be the old value here.
      act(() => {
        result.current.updatePreferences({
          moveInputMode: 'text',
          enabledMoveInputModes: ['text', 'button'],
        });
        // Inside `act` the state has been applied but React effects are
        // flushed synchronously at act boundaries — the cookie write,
        // being inline in `updatePreferences`, is already visible.
        expect(readMoveInputCookie()).toBe('text|text,button');
      });

      // Sanity: still correct after act flushes.
      expect(readMoveInputCookie()).toBe('text|text,button');
    });

    it('writes the cookie when only enabledMoveInputModes changes (mode stays the same)', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});
      expect(readMoveInputCookie()).toBe('button|button');

      act(() => {
        result.current.updatePreferences({
          enabledMoveInputModes: ['button', 'text'],
        });
      });

      expect(readMoveInputCookie()).toBe('button|button,text');
    });

    it('does NOT re-write the cookie when moveInputMode is set to its current value', async () => {
      // Preload so moveInputMode === 'text' before the update.
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          moveInputMode: 'text',
          enabledMoveInputModes: ['text', 'button'],
        })
      );

      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});
      expect(readMoveInputCookie()).toBe('text|text,button');

      // Clear the cookie to detect whether `updatePreferences` rewrites it.
      clearMoveInputCookie();
      expect(readMoveInputCookie()).toBeNull();

      act(() => {
        // Same value — the `modeKeysChanged` guard should skip the write.
        result.current.updatePreferences({ moveInputMode: 'text' });
      });

      expect(readMoveInputCookie()).toBeNull();
    });

    it('does NOT write the cookie when a non-mode preference is updated', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      // Clear the cookie to detect any incidental write.
      clearMoveInputCookie();

      act(() => {
        result.current.updatePreferences({ showCoordinates: false });
      });

      // Non-mode updates must skip the cookie write — writing on every
      // unrelated preference change would be wasteful and could race with
      // unrelated navigations.
      expect(readMoveInputCookie()).toBeNull();
    });
  });

  describe('resetPreferences', () => {
    it('writes the default hint to the cookie synchronously', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          moveInputMode: 'select',
          enabledMoveInputModes: ['select', 'text', 'button'],
        })
      );

      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});
      expect(readMoveInputCookie()).toBe('select|select,text,button');

      act(() => {
        result.current.resetPreferences();
        // Inline write — visible before effects flush.
        expect(readMoveInputCookie()).toBe('button|button');
      });

      expect(readMoveInputCookie()).toBe('button|button');
    });
  });

  describe('cross-tab storage event', () => {
    it('updates in-memory preferences but does NOT re-write the cookie', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      // Clear the cookie to detect whether the storage handler writes it.
      // The originating tab already wrote the cookie (it's process-global
      // on the origin), so this tab must not write it again.
      clearMoveInputCookie();
      expect(readMoveInputCookie()).toBeNull();

      await act(async () => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: JSON.stringify({
              moveInputMode: 'text',
              enabledMoveInputModes: ['text', 'button'],
            }),
          })
        );
      });

      // In-memory state follows the other tab…
      expect(result.current.preferences.moveInputMode).toBe('text');
      expect(result.current.preferences.enabledMoveInputModes).toEqual(['text', 'button']);

      // …but this tab MUST NOT re-write the cookie.
      expect(readMoveInputCookie()).toBeNull();
    });
  });
});

/**
 * Board-peek cookie mirror behavior. Symmetric with the move-input cookie
 * mirror coverage above: pins that `GamePreferencesContext` is the single
 * writer for the `bfc_peek_pref` cookie and that peek-related updates flush
 * synchronously (i.e. before the originating call returns), so a user who
 * toggles `peekMode` / `showBoardButtonInGame` and immediately navigates
 * cannot race a post-state-update effect.
 */
describe('GamePreferencesContext - peek cookie mirror', () => {
  beforeEach(() => {
    localStorage.clear();
    clearPeekCookie();
    clearMoveInputCookie();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    clearPeekCookie();
    clearMoveInputCookie();
  });

  describe('initial load', () => {
    it('writes the default hint to the cookie when no preferences are persisted', async () => {
      renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      // Defaults are peekMode='modal' and showBoardButtonInGame=true.
      expect(readPeekCookie()).toBe('modal|1');
    });

    it('writes the loaded peek keys to the cookie when preferences are persisted', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          peekMode: 'inline',
          showBoardButtonInGame: true,
        })
      );

      renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      expect(readPeekCookie()).toBe('inline|1');
    });

    it('writes the loaded peek keys with showBoardButtonInGame=false', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          peekMode: 'modal',
          showBoardButtonInGame: false,
        })
      );

      renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      expect(readPeekCookie()).toBe('modal|0');
    });
  });

  describe('updatePreferences', () => {
    it('writes the cookie synchronously inside the updatePreferences call when peekMode changes', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      // Wait for initial load so the "before" cookie state is stable.
      await act(async () => {});
      expect(readPeekCookie()).toBe('modal|1');

      // Synchronous check: observe `document.cookie` immediately after
      // `updatePreferences` returns, without awaiting any effects. If the
      // write had been deferred to a post-state-update `useEffect`, the
      // cookie would still be the old value here.
      act(() => {
        result.current.updatePreferences({ peekMode: 'inline' });
        expect(readPeekCookie()).toBe('inline|1');
      });

      // Sanity: still correct after act flushes.
      expect(readPeekCookie()).toBe('inline|1');
    });

    it('writes the cookie when only showBoardButtonInGame changes (peekMode stays the same)', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});
      expect(readPeekCookie()).toBe('modal|1');

      act(() => {
        result.current.updatePreferences({ showBoardButtonInGame: false });
      });

      expect(readPeekCookie()).toBe('modal|0');
    });

    it('writes both keys when peekMode and showBoardButtonInGame change together', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});
      expect(readPeekCookie()).toBe('modal|1');

      act(() => {
        result.current.updatePreferences({
          peekMode: 'inline',
          showBoardButtonInGame: false,
        });
      });

      expect(readPeekCookie()).toBe('inline|0');
    });

    it('does NOT re-write the cookie when peekMode is set to its current value', async () => {
      // Preload so peekMode === 'inline' before the update.
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          peekMode: 'inline',
          showBoardButtonInGame: true,
        })
      );

      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});
      expect(readPeekCookie()).toBe('inline|1');

      // Clear the cookie to detect whether `updatePreferences` rewrites it.
      clearPeekCookie();
      expect(readPeekCookie()).toBeNull();

      act(() => {
        // Same value — the `peekKeysChanged` guard should skip the write.
        result.current.updatePreferences({ peekMode: 'inline' });
      });

      expect(readPeekCookie()).toBeNull();
    });

    it('does NOT re-write the cookie when showBoardButtonInGame is set to its current value', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});
      expect(readPeekCookie()).toBe('modal|1');

      clearPeekCookie();
      expect(readPeekCookie()).toBeNull();

      act(() => {
        // Default is `true`; updating to the same value should skip the write.
        result.current.updatePreferences({ showBoardButtonInGame: true });
      });

      expect(readPeekCookie()).toBeNull();
    });

    it('does NOT write the peek cookie when an unrelated (moveInputMode) preference changes', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      // Clear the peek cookie to detect any incidental write from an unrelated
      // update. Writing on every preference change would be wasteful and could
      // race with unrelated navigations.
      clearPeekCookie();

      act(() => {
        result.current.updatePreferences({
          moveInputMode: 'text',
          enabledMoveInputModes: ['text', 'button'],
        });
      });

      // `peekKeysChanged` should be false → no peek cookie write.
      expect(readPeekCookie()).toBeNull();
    });

    it('does NOT write the peek cookie when a non-peek preference is updated (showCoordinates)', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      clearPeekCookie();

      act(() => {
        result.current.updatePreferences({ showCoordinates: false });
      });

      expect(readPeekCookie()).toBeNull();
    });
  });

  describe('resetPreferences', () => {
    it('writes the default hint to the cookie synchronously', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          peekMode: 'inline',
          showBoardButtonInGame: false,
        })
      );

      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});
      expect(readPeekCookie()).toBe('inline|0');

      act(() => {
        result.current.resetPreferences();
        // Inline write — visible before effects flush.
        expect(readPeekCookie()).toBe('modal|1');
      });

      expect(readPeekCookie()).toBe('modal|1');
    });
  });

  describe('cross-tab storage event', () => {
    it('updates in-memory preferences but does NOT re-write the peek cookie', async () => {
      const { result } = renderHook(() => useGamePreferences(), { wrapper });

      await act(async () => {});

      // Clear the cookie to detect whether the storage handler writes it.
      // The originating tab already wrote the cookie (it's process-global
      // on the origin), so this tab must not write it again.
      clearPeekCookie();
      expect(readPeekCookie()).toBeNull();

      await act(async () => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: JSON.stringify({
              peekMode: 'inline',
              showBoardButtonInGame: false,
            }),
          })
        );
      });

      // In-memory state follows the other tab…
      expect(result.current.preferences.peekMode).toBe('inline');
      expect(result.current.preferences.showBoardButtonInGame).toBe(false);

      // …but this tab MUST NOT re-write the cookie.
      expect(readPeekCookie()).toBeNull();
    });
  });
});
