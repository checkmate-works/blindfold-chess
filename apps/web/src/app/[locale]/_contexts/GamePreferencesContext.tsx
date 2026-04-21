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
import {
  DEFAULT_ENABLED_MOVE_INPUT_MODES,
  DEFAULT_MOVE_INPUT_MODE,
  writeMoveInputCookieClient,
} from '@/lib/games/move-input-cookie';

// Per-game preferences (subset of GamePreferences saved with each game)
export type PerGamePreferences = {
  showBoardButtonInGame: boolean;
  highlightLastMove: boolean;
  showOwnPieces: boolean;
  showOpponentPieces: boolean;
  pieceShapeMode: 'normal' | 'circles-all' | 'circles-own' | 'circles-opponent';
  pieceColors: 'normal' | 'white-only' | 'black-only';
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
  // Board button visibility
  showBoardButtonInGame: boolean; // Show "View Board" button during AI games
  // Board peek mode
  peekMode: 'modal' | 'inline'; // How to display the board peek (modal dialog or inline accordion)
};

// Default preferences. `moveInputMode` / `enabledMoveInputModes` are derived
// from the shared `DEFAULT_MOVE_INPUT_*` constants in `@/lib/games/move-input-cookie`
// so the SSR cookie hint and the client-side defaults can never drift apart.
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
  showBoardButtonInGame: true,
  peekMode: 'modal',
};

// Validate and sanitize parsed preferences from localStorage.
// Only picks known keys with valid types/values; unknown keys are ignored.
function validatePreferences(parsed: unknown): Partial<GamePreferences> {
  if (typeof parsed !== 'object' || parsed === null) return {};

  const p = parsed as Record<string, unknown>;
  const result: Partial<GamePreferences> = {};

  if (typeof p.showCoordinates === 'boolean') result.showCoordinates = p.showCoordinates;
  if (typeof p.highlightLastMove === 'boolean') result.highlightLastMove = p.highlightLastMove;
  if (
    typeof p.boardTheme === 'string' &&
    ['monotone', 'lichess', 'chesscom'].includes(p.boardTheme)
  ) {
    result.boardTheme = p.boardTheme as BoardTheme;
  }
  if (typeof p.showOwnPieces === 'boolean') result.showOwnPieces = p.showOwnPieces;
  if (typeof p.showOpponentPieces === 'boolean') result.showOpponentPieces = p.showOpponentPieces;
  if (
    typeof p.pieceShapeMode === 'string' &&
    ['normal', 'circles-all', 'circles-own', 'circles-opponent'].includes(p.pieceShapeMode)
  ) {
    result.pieceShapeMode = p.pieceShapeMode as GamePreferences['pieceShapeMode'];
  }
  if (
    typeof p.pieceColors === 'string' &&
    ['normal', 'white-only', 'black-only'].includes(p.pieceColors)
  ) {
    result.pieceColors = p.pieceColors as GamePreferences['pieceColors'];
  }
  if (
    typeof p.moveInputMode === 'string' &&
    ['text', 'select', 'button'].includes(p.moveInputMode)
  ) {
    result.moveInputMode = p.moveInputMode as GamePreferences['moveInputMode'];
  }
  if (Array.isArray(p.enabledMoveInputModes)) {
    const validModes = ['text', 'select', 'button'] as const;
    const filtered = p.enabledMoveInputModes.filter(
      (m: unknown): m is GamePreferences['moveInputMode'] =>
        typeof m === 'string' && validModes.includes(m as (typeof validModes)[number])
    );
    if (filtered.length > 0) {
      result.enabledMoveInputModes = filtered;
    }
  }
  if (
    typeof p.buttonInputPieceLabel === 'string' &&
    ['text', 'icon'].includes(p.buttonInputPieceLabel)
  ) {
    result.buttonInputPieceLabel =
      p.buttonInputPieceLabel as GamePreferences['buttonInputPieceLabel'];
  }
  if (typeof p.enableAutoComplete === 'boolean') result.enableAutoComplete = p.enableAutoComplete;
  if (typeof p.showBoardButtonInGame === 'boolean')
    result.showBoardButtonInGame = p.showBoardButtonInGame;
  if (typeof p.peekMode === 'string' && ['modal', 'inline'].includes(p.peekMode)) {
    result.peekMode = p.peekMode as GamePreferences['peekMode'];
  }

  return result;
}

// Local storage key
const PREFERENCES_STORAGE_KEY = 'blindfold-chess-game-preferences';

type GamePreferencesContextType = {
  preferences: GamePreferences;
  isLoaded: boolean;
  /**
   * `true` once the client has read preferences from localStorage (or
   * determined that none are persisted). `false` on the server and on the
   * very first client render, allowing consumers to render a skeleton until
   * the saved-mode vs default-mode ambiguity is resolved.
   *
   * Semantically equivalent to `isLoaded` today — kept as a distinct field
   * so call sites can express "waiting for hydration" intent explicitly.
   */
  isHydrated: boolean;
  updatePreferences: (updates: Partial<GamePreferences>) => void;
  resetPreferences: () => void;
};

const GamePreferencesContext = createContext<GamePreferencesContextType | undefined>(undefined);

export function GamePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<GamePreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Mirror `preferences` into a ref so `updatePreferences` can read the
  // current value without being re-created (and invalidating consumer
  // memoization) on every preference change.
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  // Load preferences from localStorage on mount.
  //
  // Cookie-write responsibility: this effect writes the `bfc_move_input_pref`
  // cookie directly with the loaded (or default) mode keys. Updates made
  // later go through `updatePreferences` / `resetPreferences`, which write
  // the cookie synchronously before returning — see the comment on
  // `updatePreferences` below for the rationale (race with immediate
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
      // Align the SSR cookie hint with the just-loaded preferences so the
      // next navigation's SSR paint uses the correct skeleton shape.
      writeMoveInputCookieClient({
        mode: loaded.moveInputMode,
        enabledModes: loaded.enabledMoveInputModes,
      });
      setIsLoaded(true);
      setIsHydrated(true);
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

  // Mirror the move-input mode keys to the `bfc_move_input_pref` cookie so
  // the SSR pipeline can emit the right `MoveInputSkeleton` shape on the
  // next navigation. The cookie write is performed **synchronously** here,
  // before `setPreferences` schedules a re-render and before the user can
  // navigate / trigger a Next.js prefetch of `/games/play`. If we relied on
  // a post-state-update `useEffect` (as a previous version did), a user
  // toggling mode and immediately reloading could race the effect and hit
  // the server with a stale cookie, yielding the wrong skeleton.
  //
  // The cookie is a server-facing hint only — localStorage remains the
  // source of truth for the full preferences object.
  //
  // Single-writer rule: this provider is the ONLY place that writes the
  // cookie. Any other writer will cause drift with localStorage. If the
  // cookie is cleared externally (privacy extensions, incognito, etc.),
  // SSR falls back to the default hint until the user next changes a
  // mode-related preference — an acceptable degradation to today's baseline.
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
    setPreferences(next);
  }, []);

  const resetPreferences = useCallback(() => {
    // Write the cookie synchronously so a reset user's next navigation
    // sees the default SSR hint (matching the reset state), not whatever
    // was last persisted.
    writeMoveInputCookieClient({
      mode: defaultPreferences.moveInputMode,
      enabledModes: defaultPreferences.enabledMoveInputModes,
    });
    setPreferences(defaultPreferences);
  }, []);

  const value = useMemo<GamePreferencesContextType>(
    () => ({
      preferences,
      isLoaded,
      isHydrated,
      updatePreferences,
      resetPreferences,
    }),
    [preferences, isLoaded, isHydrated, updatePreferences, resetPreferences]
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
