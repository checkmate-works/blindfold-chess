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

import type { AiReplyDuration } from '@/lib/games/ai-reply-duration';
import { DEFAULT_AI_REPLY_DURATION } from '@/lib/games/ai-reply-duration';
import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';
import type { BoardVisibility } from '@/lib/games/board-visibility';
import { DEFAULT_BOARD_VISIBILITY } from '@/lib/games/board-visibility';
import { writeBoardVisibilityCookieClient } from '@/lib/games/board-visibility-cookie';
import {
  DEFAULT_ENABLED_MOVE_INPUT_MODES,
  DEFAULT_MOVE_INPUT_MODE,
  writeMoveInputCookieClient,
} from '@/lib/games/move-input-cookie';

import { validatePreferences } from './game-preferences-validation';

// Per-game preferences (subset of GamePreferences saved with each game).
// `boardVisibility` is a "Controls"-tier setting in the global Preferences
// page but is included here too: how the board surfaces during
// gameplay often changes per-game depending on how the player wants to
// experience that specific session. Legacy records (saved before either
// field existed in this shape) are tolerated via `??` fallbacks at every
// consumer site and on-read migration in the validators.
export type PerGamePreferences = {
  boardVisibility: BoardVisibility;
  highlightLastMove: boolean;
  /**
   * Whether selecting / tapping a piece reveals its legal destination squares
   * (the lichess-style move dots). Off makes the visible board a harder,
   * hint-free surface. Per-game (mirroring `highlightLastMove`) because it is a
   * display assist players often dial per session.
   */
  showPieceDestinations: boolean;
  showOwnPieces: boolean;
  showOpponentPieces: boolean;
  pieceShapeMode: 'normal' | 'circles-all' | 'circles-own' | 'circles-opponent';
  pieceColors: 'normal' | 'white-only' | 'black-only';
  /**
   * Which pawns are hidden during play — a partial-blindfold mode orthogonal to
   * the all/own/opponent piece-visibility axis above. `'none'` (default) hides
   * no pawns; `'all'` hides both sides' pawns; `'own'` / `'opponent'` hide only
   * that side's pawns. Composes with the other obfuscation axes: a fully hidden
   * side already hides its pawns, so this only narrows hiding to pawns on a side
   * that is otherwise shown. Per-game (mirroring `pieceShapeMode`) because the
   * blindfold intensity is dialled per session.
   */
  pawnHideMode: 'none' | 'all' | 'own' | 'opponent';
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
  /**
   * How long the on-board AI-reply chip keeps the opponent's last move visible
   * (ms; `0` = keep until the next reply). Per-game because how long a player
   * wants the move to linger depends on the blindfold intensity they chose for
   * that specific session. Only meaningful when the board is hidden
   * (`boardVisibility !== 'always'`). Falls back to the global value for legacy
   * records that predate this field.
   */
  aiReplyDuration: AiReplyDuration;
};

// Game preferences
export type GamePreferences = {
  // Board appearance
  showCoordinates: boolean; // Show rank and file labels on the board
  highlightLastMove: boolean; // Highlight the last move on the board
  showPieceDestinations: boolean; // Show legal destination squares when a piece is selected
  boardTheme: BoardTheme; // Board color theme
  // Piece visibility
  showOwnPieces: boolean; // Show player's own pieces
  showOpponentPieces: boolean; // Show opponent's pieces
  // Piece appearance
  pieceShapeMode: 'normal' | 'circles-all' | 'circles-own' | 'circles-opponent'; // Piece shape mode
  pieceColors: 'normal' | 'white-only' | 'black-only'; // Piece color mode
  pawnHideMode: 'none' | 'all' | 'own' | 'opponent'; // Hide pawns (none / both / own / opponent)
  // Move input
  moveInputMode: 'text' | 'select' | 'button'; // Move input mode
  enabledMoveInputModes: ('text' | 'select' | 'button')[]; // Which move input modes are available
  buttonInputPieceLabel: 'text' | 'icon'; // Button input label style
  enableAutoComplete: boolean; // Enable auto-complete for text input
  // Board visibility during gameplay — see BoardVisibility for semantics.
  boardVisibility: BoardVisibility;
  // How long the on-board AI-reply chip keeps the opponent's last move visible
  // in blindfold modes (ms; 0 = keep until the next reply). See AiReplyDuration.
  aiReplyDuration: AiReplyDuration;
};

// Default preferences. `moveInputMode` / `enabledMoveInputModes` are derived
// from the shared `DEFAULT_MOVE_INPUT_*` constants in `@/lib/games/move-input-cookie`;
// and `boardVisibility` from `DEFAULT_BOARD_VISIBILITY` in
// `@/lib/games/board-visibility`, so the SSR cookie hint and the client-side
// defaults can never drift apart.
const defaultPreferences: GamePreferences = {
  showCoordinates: true,
  highlightLastMove: true,
  showPieceDestinations: true,
  boardTheme: DEFAULT_BOARD_THEME,
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
  moveInputMode: DEFAULT_MOVE_INPUT_MODE,
  enabledMoveInputModes: [...DEFAULT_ENABLED_MOVE_INPUT_MODES],
  buttonInputPieceLabel: 'icon',
  enableAutoComplete: true,
  boardVisibility: DEFAULT_BOARD_VISIBILITY,
  aiReplyDuration: DEFAULT_AI_REPLY_DURATION,
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
  // cookie directly with the loaded (or default) keys. Updates made later go
  // through `updatePreferences` / `resetPreferences`, which write the cookie
  // synchronously before returning — see the comment on `updatePreferences`
  // below for the rationale (race with immediate navigation / prefetch). We
  // deliberately do NOT keep a secondary
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
      writeBoardVisibilityCookieClient(loaded.boardVisibility);
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

  // Mirror the move-input mode keys to the `bfc_move_input_pref` cookie so the
  // SSR pipeline can emit the right move-input skeleton shape on the next
  // navigation. The cookie write is performed **synchronously** here, before
  // `setPreferences` schedules a re-render and before the user can navigate /
  // trigger a Next.js prefetch of `/games/play`. If we relied on a
  // post-state-update `useEffect` (as a previous version did), a user toggling
  // a preference and immediately reloading could race the effect and hit the
  // server with a stale cookie, yielding the wrong skeleton.
  //
  // The cookie is a server-facing hint only — localStorage remains the source
  // of truth for the full preferences object.
  //
  // Single-writer rule: this provider is the ONLY place that writes the
  // cookie. Any other writer will cause drift with localStorage. If the
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
    if ('boardVisibility' in updates && updates.boardVisibility !== prev.boardVisibility) {
      writeBoardVisibilityCookieClient(next.boardVisibility);
    }
    setPreferences(next);
  }, []);

  const resetPreferences = useCallback(() => {
    // Write the cookie synchronously so a reset user's next navigation sees the
    // default SSR hint (matching the reset state), not whatever was last
    // persisted.
    writeMoveInputCookieClient({
      mode: defaultPreferences.moveInputMode,
      enabledModes: defaultPreferences.enabledMoveInputModes,
    });
    writeBoardVisibilityCookieClient(defaultPreferences.boardVisibility);
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
