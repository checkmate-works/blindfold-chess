import { isAiReplyDuration } from '@/lib/games/ai-reply-duration';
import type { BoardTheme } from '@/lib/games/board-themes';
import { isBoardVisibility, legacyToBoardVisibility } from '@/lib/games/board-visibility';

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
  if (typeof p.showPieceDestinations === 'boolean')
    result.showPieceDestinations = p.showPieceDestinations;
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
    typeof p.pawnHideMode === 'string' &&
    ['none', 'all', 'own', 'opponent'].includes(p.pawnHideMode)
  ) {
    result.pawnHideMode = p.pawnHideMode as GamePreferences['pawnHideMode'];
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
  // boardVisibility migration: accept the new 3-state value when present, OR
  // the legacy boolean `showBoardButtonInGame` and translate it. The legacy
  // path is purely a read-side concern — the next write emits only the new
  // key. If both somehow co-exist on disk, the new key wins (records written
  // by post-migration code).
  if (isBoardVisibility(p.boardVisibility)) {
    result.boardVisibility = p.boardVisibility;
  } else if (typeof p.showBoardButtonInGame === 'boolean') {
    result.boardVisibility = legacyToBoardVisibility(p.showBoardButtonInGame);
  }
  if (isAiReplyDuration(p.aiReplyDuration)) {
    result.aiReplyDuration = p.aiReplyDuration;
  }
  return result;
}
