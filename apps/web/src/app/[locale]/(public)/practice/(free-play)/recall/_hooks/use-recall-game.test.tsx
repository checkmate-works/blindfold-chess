import type { AlgebraicNotation } from '@blindfold-chess/types';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { computeRecallStats } from '../_lib';
import { useRecallGame } from './use-recall-game';

const PGN = '1. e4 e5 2. Nf3 Nc6';

describe('useRecallGame full-session flows', () => {
  it('runs a both-sides session: correct, wrong attempt, skip, then bulk fill', () => {
    const { result } = renderHook(() =>
      useRecallGame({ pgn: PGN, playerColor: 'white', autoOpponent: false })
    );

    // PGN parsed on mount.
    expect(result.current.gameProgress.originalMoves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(result.current.settings.isPlayerTurn).toBe(true);

    act(() => result.current.actions.handleSubmitMove('e4' as AlgebraicNotation));
    expect(result.current.moveInput.lastFeedback?.type).toBe('correct');

    // Wrong attempt at e5 does not advance; the correct retry does.
    act(() => result.current.actions.handleSubmitMove('d5' as AlgebraicNotation));
    expect(result.current.moveInput.lastFeedback?.type).toBe('incorrect');
    expect(result.current.gameProgress.currentMoveIndex).toBe(1);
    act(() => result.current.actions.handleSubmitMove('e5' as AlgebraicNotation));

    act(() => result.current.actions.handleDontKnow());
    expect(result.current.moveInput.lastFeedback).toMatchObject({ type: 'skipped', move: 'Nf3' });

    act(() => result.current.actions.handleAnalyzeAll());

    expect(result.current.gameProgress.isCompleted).toBe(true);
    expect(result.current.gameProgress.progress).toBe(4);
    expect(result.current.moveLog.entries.map((e) => e.status)).toEqual([
      'correct',
      'incorrect',
      'correct',
      'skipped',
      'autoFilled',
    ]);
    expect(computeRecallStats(result.current.moveLog.entries)).toMatchObject({
      nailed: 1,
      struggled: 1,
      missed: 2,
      mistakes: 1,
      total: 4,
      recalled: 2,
    });
    // The board reflects the fully replayed game.
    expect(result.current.gameProgress.userMoves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('auto-fills the opponent after each player move in auto-opponent mode', () => {
    const { result } = renderHook(() =>
      useRecallGame({ pgn: PGN, playerColor: 'white', autoOpponent: true })
    );

    act(() => result.current.actions.handleSubmitMove('e4' as AlgebraicNotation));

    // The opponent's e5 follows automatically; it is back to the player.
    expect(result.current.moveLog.entries.map((e) => e.status)).toEqual(['correct', 'auto']);
    expect(result.current.gameProgress.currentMoveIndex).toBe(2);
    expect(result.current.settings.isPlayerTurn).toBe(true);

    act(() => result.current.actions.handleAnalyzeAll());

    // Bulk fill keeps the opponent's Nc6 out of the user's misses.
    expect(result.current.moveLog.entries.map((e) => e.status)).toEqual([
      'correct',
      'auto',
      'autoFilled',
      'auto',
    ]);
    expect(result.current.gameProgress.isCompleted).toBe(true);
    expect(computeRecallStats(result.current.moveLog.entries)).toMatchObject({
      nailed: 1,
      missed: 1,
      total: 2,
    });
  });

  it('completes via the auto-opponent when the last move is theirs', () => {
    const { result } = renderHook(() =>
      useRecallGame({ pgn: PGN, playerColor: 'white', autoOpponent: true })
    );

    act(() => result.current.actions.handleSubmitMove('e4' as AlgebraicNotation));
    act(() => result.current.actions.handleSubmitMove('Nf3' as AlgebraicNotation));

    // Nc6 (opponent's, and the game's final move) auto-fills to completion.
    expect(result.current.gameProgress.isCompleted).toBe(true);
    expect(result.current.moveLog.entries.map((e) => e.status)).toEqual([
      'correct',
      'auto',
      'correct',
      'auto',
    ]);
    expect(computeRecallStats(result.current.moveLog.entries)).toMatchObject({
      nailed: 2,
      missed: 0,
      total: 2,
    });
  });
});
