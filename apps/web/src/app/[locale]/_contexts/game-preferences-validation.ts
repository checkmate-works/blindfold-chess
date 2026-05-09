import type { BoardTheme } from '@/lib/games/board-themes';

import type { GamePreferences } from './GamePreferencesContext';

/**
 * Validate and sanitize parsed preferences from localStorage.
 *
 * Only picks known keys with valid types/values; unknown keys are ignored.
 * Returned as `Partial` so the caller can spread it onto `defaultPreferences`
 * to fill in any keys absent from a partially-written or older payload.
 *
 * Extracted from `GamePreferencesContext` so the context file is left to
 * orchestrate state + effects, and the per-key validation table can grow
 * (and be unit-tested) independently of React.
 */
export function validatePreferences(parsed: unknown): Partial<GamePreferences> {
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
