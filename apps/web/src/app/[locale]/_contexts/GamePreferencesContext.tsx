'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';
import type { BoardVisibility } from '@/lib/games/board-visibility';
import { DEFAULT_BOARD_VISIBILITY } from '@/lib/games/board-visibility';
import {
  DEFAULT_ENABLED_MOVE_INPUT_MODES,
  DEFAULT_MOVE_INPUT_MODE,
  writeMoveInputCookieClient,
} from '@/lib/games/move-input-cookie';
import { DEFAULT_PEEK_MODE, writePeekPreferenceCookie } from '@/lib/games/peek-cookie';

import { validatePreferences } from './game-preferences-validation';

// Per-game preferences (subset of GamePreferences saved with each game).
// `boardVisibility` and `peekMode` are "Controls"-tier settings in the global
// Preferences page but are included here too: how the board surfaces during
// gameplay often changes per-game depending on how the player wants to
// experience that specific session. Legacy records (saved before either
// field existed in this shape) are tolerated via `??` fallbacks at every
// consumer site and on-read migration in the validators.
export type PerGamePreferences = {
  boardVisibility: BoardVisibility;
  highlightLastMove: boolean;
  showOwnPieces: boolean;
  showOpponentPieces: boolean;
  pieceShapeMode: 'normal' | 'circles-all' | 'circles-own' | 'circles-opponent';
  pieceColors: 'normal' | 'white-only' | 'black-only';
  peekMode: 'modal' | 'inline';
  /**
   * Active move-input mode for this game. Per-game so mid-game switches
   * (text → button → select) accumulate in the preference change log
   * rather than mutating the user's global default. The user's per-game
   * value falls back to the global `moveInputMode` when the per-game field
   * is absent (legacy records). The orthogonal `enabledMoveInputModes`
   * (which modes are even available to switch between) remains a global
   * setting — it controls UI affordance availability, not per-game intent.
   */
  moveInputMode: 'text' | 'select' | 'button';
};

// Game preferences
export type GamePreferences = {
  // Board appearance
  showCoordinates: boolean; // Show rank and file labels on the board
  highlightLastMove: boolean; // Highlight the last move on the board
  boardTheme: BoardTheme; // Board color theme
  // Piece visibility
  showOwnPieces: boolean; // Show player's own pieces
  showOpponentPieces: boolean; // Show opponent's pieces
  // Piece appearance
  pieceShapeMode: 'normal' | 'circles-all' | 'circles-own' | 'circles-opponent'; // Piece shape mode
  pieceColors: 'normal' | 'white-only' | 'black-only'; // Piece color mode
  // Move input
  moveInputMode: 'text' | 'select' | 'button'; // Move input mode
  enabledMoveInputModes: ('text' | 'select' | 'button')[]; // Which move input modes are available
  buttonInputPieceLabel: 'text' | 'icon'; // Button input label style
  enableAutoComplete: boolean; // Enable auto-complete for text input
  // Board visibility during gameplay — see BoardVisibility for semantics.
  boardVisibility: BoardVisibility;
  // Board peek mode
  peekMode: 'modal' | 'inline'; // How to display the board peek (modal dialog or inline accordion)
};

// Default preferences. `moveInputMode` / `enabledMoveInputModes` are derived
// from the shared `DEFAULT_MOVE_INPUT_*` constants in `@/lib/games/move-input-cookie`;
// `peekMode` from `DEFAULT_PEEK_MODE` in the same module; and `boardVisibility`
// from `DEFAULT_BOARD_VISIBILITY` in `@/lib/games/board-visibility`, so the
// SSR cookie hints and the client-side defaults can never drift apart.
const defaultPreferences: GamePreferences = {
  showCoordinates: true,
  highlightLastMove: true,
  boardTheme: DEFAULT_BOARD_THEME,
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  moveInputMode: DEFAULT_MOVE_INPUT_MODE,
  enabledMoveInputModes: [...DEFAULT_ENABLED_MOVE_INPUT_MODES],
  buttonInputPieceLabel: 'icon',
  enableAutoComplete: true,
  boardVisibility: DEFAULT_BOARD_VISIBILITY,
  peekMode: DEFAULT_PEEK_MODE,
};

// Local storage key
const PREFERENCES_STORAGE_KEY = 'blindfold-chess-game-preferences';

type GamePreferencesContextType = {
  preferences: GamePreferences;
  /**
   * `true` once the client has read preferences from localStorage (or
   * determined that none are persisted). `false` on the server and on the
   * very first client render, allowing consumers to render a skeleton until
   * the saved-mode vs default-mode ambiguity is resolved.
   */
  isLoaded: boolean;
  /**
   * Alias of `isLoaded`. Kept as a distinct field name so call sites can
   * express "waiting for hydration" intent explicitly; both fields always
   * resolve to the same underlying state.
   */
  isHydrated: boolean;
  updatePreferences: (updates: Partial<GamePreferences>) => void;
  resetPreferences: () => void;
};

const GamePreferencesContext = createContext<GamePreferencesContextType | undefined>(undefined);

export function GamePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<GamePreferences>(defaultPreferences);
  // Single underlying flag for both `isLoaded` and `isHydrated`. They have
  // always flipped together (see the `finally` block in the load effect);
  // keeping them as one state variable ensures they cannot drift.
  const [isLoaded, setIsLoaded] = useState(false);

  // Mirror `preferences` into a ref so `updatePreferences` can read the
  // current value without being re-created (and invalidating consumer
  // memoization) on every preference change.
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  // Load preferences from localStorage on mount.
  //
  // Cookie-write responsibility: this effect writes the `bfc_move_input_pref`
  // and `bfc_peek_pref` cookies directly with the loaded (or default) keys.
  // Updates made later go through `updatePreferences` / `resetPreferences`,
  // which write the cookies synchronously before returning — see the comment
  // on `updatePreferences` below for the rationale (race with immediate
  // navigation / prefetch). We deliberately do NOT keep a secondary
  // `useEffect` keyed on mode changes: that effect fires asynchronously
  // after `setState`, which is exactly the race we're closing.
  useEffect(() => {
    let loaded: GamePreferences = defaultPreferences;
    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        const validated = validatePreferences(JSON.parse(stored));
        const merged = {
          ...defaultPreferences,
          ...validated,
        };
        // If current moveInputMode is not in enabledMoveInputModes, switch to first enabled mode
        if (!merged.enabledMoveInputModes.includes(merged.moveInputMode)) {
          merged.moveInputMode = merged.enabledMoveInputModes[0];
        }
        loaded = merged;
        setPreferences(merged);
      }
    } catch (error) {
      console.warn('Failed to load game preferences from localStorage:', error);
    } finally {
      // Align the SSR cookie hints with the just-loaded preferences so the
      // next navigation's SSR paint uses the correct skeleton shape.
      writeMoveInputCookieClient({
        mode: loaded.moveInputMode,
        enabledModes: loaded.enabledMoveInputModes,
      });
      writePeekPreferenceCookie({
        peekMode: loaded.peekMode,
        boardVisibility: loaded.boardVisibility,
      });
      setIsLoaded(true);
    }
  }, []);

  // Sync preferences across browser tabs.
  //
  // Cookie-write responsibility: the other tab that actually called
  // `updatePreferences` already wrote the cookie synchronously in its own
  // document. A cookie is shared across same-origin tabs, so we do not need
  // to re-write it here.
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PREFERENCES_STORAGE_KEY && e.newValue) {
        try {
          const validated = validatePreferences(JSON.parse(e.newValue));
          setPreferences((prev) => ({ ...prev, ...validated }));
        } catch {
          // Ignore malformed data
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return; // Don't save until initial load is complete

    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save game preferences to localStorage:', error);
    }
  }, [preferences, isLoaded]);

  // Mirror the move-input mode keys to the `bfc_move_input_pref` cookie, and
  // the board-peek keys to the `bfc_peek_pref` cookie, so the SSR pipeline
  // can emit the right skeleton shape on the next navigation. The cookie
  // writes are performed **synchronously** here, before `setPreferences`
  // schedules a re-render and before the user can navigate / trigger a
  // Next.js prefetch of `/games/play`. If we relied on a post-state-update
  // `useEffect` (as a previous version did), a user toggling a preference
  // and immediately reloading could race the effect and hit the server with
  // a stale cookie, yielding the wrong skeleton.
  //
  // The cookies are server-facing hints only — localStorage remains the
  // source of truth for the full preferences object.
  //
  // Single-writer rule: this provider is the ONLY place that writes the
  // cookies. Any other writer will cause drift with localStorage. If a
  // cookie is cleared externally (privacy extensions, incognito, etc.),
  // SSR falls back to the default hint until the user next changes a
  // related preference — an acceptable degradation to today's baseline.
  const updatePreferences = useCallback((updates: Partial<GamePreferences>) => {
    const prev = preferencesRef.current;
    const next = { ...prev, ...updates };
    const modeKeysChanged =
      ('moveInputMode' in updates && updates.moveInputMode !== prev.moveInputMode) ||
      ('enabledMoveInputModes' in updates &&
        updates.enabledMoveInputModes !== prev.enabledMoveInputModes);
    if (modeKeysChanged) {
      writeMoveInputCookieClient({
        mode: next.moveInputMode,
        enabledModes: next.enabledMoveInputModes,
      });
    }
    const peekKeysChanged =
      ('peekMode' in updates && updates.peekMode !== prev.peekMode) ||
      ('boardVisibility' in updates && updates.boardVisibility !== prev.boardVisibility);
    if (peekKeysChanged) {
      writePeekPreferenceCookie({
        peekMode: next.peekMode,
        boardVisibility: next.boardVisibility,
      });
    }
    setPreferences(next);
  }, []);

  const resetPreferences = useCallback(() => {
    // Write the cookies synchronously so a reset user's next navigation
    // sees the default SSR hints (matching the reset state), not whatever
    // was last persisted.
    writeMoveInputCookieClient({
      mode: defaultPreferences.moveInputMode,
      enabledModes: defaultPreferences.enabledMoveInputModes,
    });
    writePeekPreferenceCookie({
      peekMode: defaultPreferences.peekMode,
      boardVisibility: defaultPreferences.boardVisibility,
    });
    setPreferences(defaultPreferences);
  }, []);

  const value = useMemo<GamePreferencesContextType>(
    () => ({
      preferences,
      isLoaded,
      // Alias: see the field-level comment on `GamePreferencesContextType`.
      isHydrated: isLoaded,
      updatePreferences,
      resetPreferences,
    }),
    [preferences, isLoaded, updatePreferences, resetPreferences]
  );

  return (
    <GamePreferencesContext.Provider value={value}>{children}</GamePreferencesContext.Provider>
  );
}

export function useGamePreferences() {
  const context = useContext(GamePreferencesContext);
  if (!context) {
    throw new Error('useGamePreferences must be used within a GamePreferencesProvider');
  }
  return context;
}
