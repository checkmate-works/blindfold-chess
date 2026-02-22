'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME } from '@/lib/boardThemes';

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
  buttonInputPieceLabel: 'text' | 'icon'; // Button input label style
  enableAutoComplete: boolean; // Enable auto-complete for text input
  // Advertisements
  adsEnabled: boolean; // Show advertisements
};

// Default preferences
const defaultPreferences: GamePreferences = {
  showCoordinates: true,
  highlightLastMove: true,
  boardTheme: DEFAULT_BOARD_THEME,
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  moveInputMode: 'text',
  buttonInputPieceLabel: 'icon',
  enableAutoComplete: true,
  adsEnabled: true,
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
  if (
    typeof p.buttonInputPieceLabel === 'string' &&
    ['text', 'icon'].includes(p.buttonInputPieceLabel)
  ) {
    result.buttonInputPieceLabel =
      p.buttonInputPieceLabel as GamePreferences['buttonInputPieceLabel'];
  }
  if (typeof p.enableAutoComplete === 'boolean') result.enableAutoComplete = p.enableAutoComplete;
  if (typeof p.adsEnabled === 'boolean') result.adsEnabled = p.adsEnabled;

  return result;
}

// Local storage key
const PREFERENCES_STORAGE_KEY = 'blindfold-chess-game-preferences';

type GamePreferencesContextType = {
  preferences: GamePreferences;
  updatePreferences: (updates: Partial<GamePreferences>) => void;
  resetPreferences: () => void;
};

const GamePreferencesContext = createContext<GamePreferencesContextType | undefined>(undefined);

export function GamePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<GamePreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        const validated = validatePreferences(JSON.parse(stored));
        setPreferences({
          ...defaultPreferences,
          ...validated,
        });
      }
    } catch (error) {
      console.warn('Failed to load game preferences from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
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

  const updatePreferences = useCallback((updates: Partial<GamePreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
  }, []);

  const value = useMemo<GamePreferencesContextType>(
    () => ({
      preferences,
      updatePreferences,
      resetPreferences,
    }),
    [preferences, updatePreferences, resetPreferences]
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
