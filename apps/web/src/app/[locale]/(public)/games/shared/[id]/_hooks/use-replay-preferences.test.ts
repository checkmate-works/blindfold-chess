// @vitest-environment jsdom
/**
 * Coverage for `preferencesAt` — the per-position preferences computation
 * used by the "By Move" quick-peek modal, which navigates independently of
 * the live board (see useQuickPeekModal). The user-reported bug: opening the
 * modal at a position after a mid-game "peek → always" change still showed
 * pieces as hidden, because the modal reused the live board's preferences
 * (computed from the live board's OWN position) instead of recomputing for
 * the position being previewed inside the modal.
 *
 * `hiddenPieceStyle` alone doesn't distinguish "visible" from "hidden" — it's
 * 'ghost' whenever reproduceView is on regardless of what's actually hidden
 * at that position (the board component only draws ghosts where something IS
 * hidden). The real per-position visibility signal is
 * `boardPreferences.showOwnPieces` / `showOpponentPieces`.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { GamePlaySettings, PlaySettingsChangeEntry } from '@/lib/games/saved-game-types';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { useReplayPreferences } from './use-replay-preferences';

const PREFERENCES: GamePreferences = {
  showCoordinates: true,
  highlightLastMove: true,
  showPieceDestinations: true,
  boardTheme: 'monotone',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
  moveInputMode: 'text',
  enabledMoveInputModes: ['text'],
  buttonInputPieceLabel: 'icon',
  enableAutoComplete: true,
  boardVisibility: 'always',
  aiReplyDuration: 5000,
};

const PLAY_SETTINGS: GamePlaySettings = {
  boardVisibility: 'peek',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

// Board hidden (peek) until half-move 4 (atMoveIndex=4), then revealed.
const REVEAL_AT_4: PlaySettingsChangeEntry[] = [
  { atMoveIndex: 4, key: 'boardVisibility', to: 'always' },
];

describe('useReplayPreferences preferencesAt', () => {
  it('reflects the live board position by default', () => {
    const { result } = renderHook(() =>
      useReplayPreferences({
        preferences: PREFERENCES,
        playSettings: PLAY_SETTINGS,
        playSettingsLog: REVEAL_AT_4,
        currentPosition: 5, // ply 5 → 6 half-moves played, after the reveal
        notationMovesLength: 10,
      })
    );

    expect(result.current.effectivePlaySettings?.boardVisibility).toBe('always');
    expect(result.current.boardPreferences.showOwnPieces).toBe(true);
    expect(result.current.boardPreferences.showOpponentPieces).toBe(true);
  });

  it('computes a DIFFERENT result for a modal position independent of the live board', () => {
    // Live board sits before the reveal (still hidden); the quick-peek modal
    // is scrubbed to a position AFTER the reveal.
    const { result } = renderHook(() =>
      useReplayPreferences({
        preferences: PREFERENCES,
        playSettings: PLAY_SETTINGS,
        playSettingsLog: REVEAL_AT_4,
        currentPosition: 1, // 2 half-moves played — before the reveal
        notationMovesLength: 10,
      })
    );

    // Live board: still hidden.
    expect(result.current.effectivePlaySettings?.boardVisibility).toBe('peek');
    expect(result.current.boardPreferences.showOwnPieces).toBe(false);
    expect(result.current.boardPreferences.showOpponentPieces).toBe(false);

    // Quick-peek modal previewing ply 5 (6 half-moves played): past the
    // reveal, so it must show pieces normally — NOT inherit the live
    // board's still-hidden state (this is the reported bug).
    const modal = result.current.preferencesAt(5);
    expect(modal.effectivePlaySettings?.boardVisibility).toBe('always');
    expect(modal.boardPreferences.showOwnPieces).toBe(true);
    expect(modal.boardPreferences.showOpponentPieces).toBe(true);
  });

  it('keeps the modal hidden when previewing a position before the reveal', () => {
    const { result } = renderHook(() =>
      useReplayPreferences({
        preferences: PREFERENCES,
        playSettings: PLAY_SETTINGS,
        playSettingsLog: REVEAL_AT_4,
        currentPosition: 5, // live board past the reveal
        notationMovesLength: 10,
      })
    );

    const modal = result.current.preferencesAt(1); // modal before the reveal
    expect(modal.effectivePlaySettings?.boardVisibility).toBe('peek');
    expect(modal.boardPreferences.showOwnPieces).toBe(false);
    expect(modal.boardPreferences.showOpponentPieces).toBe(false);
  });

  it('reveals everything for both the live board and the modal when reproduceView is off', () => {
    const { result } = renderHook(() =>
      useReplayPreferences({
        preferences: PREFERENCES,
        playSettings: PLAY_SETTINGS,
        playSettingsLog: REVEAL_AT_4,
        currentPosition: 1, // before the reveal — would otherwise be hidden
        notationMovesLength: 10,
      })
    );

    act(() => result.current.setReproduceView(false));

    expect(result.current.boardPreferences.showOwnPieces).toBe(true);
    expect(result.current.hiddenPieceStyle).toBe('absent');
    const modal = result.current.preferencesAt(1);
    expect(modal.boardPreferences.showOwnPieces).toBe(true);
    expect(modal.hiddenPieceStyle).toBe('absent');
  });
});
