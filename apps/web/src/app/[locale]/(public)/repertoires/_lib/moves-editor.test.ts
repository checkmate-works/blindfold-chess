import { describe, expect, it } from 'vitest';

import type { MovesEditorState } from './moves-editor';
import { initialMovesEditor, movesEditorReducer } from './moves-editor';

const E4 = { positionKey: 'pk-e4', label: '1. e4' };
const E5 = { positionKey: 'pk-e5', label: '1... e5' };

const PGN_MODE: MovesEditorState = { mode: 'pgn', pgn: '1. e4' };
const BOARD_MODE: MovesEditorState = { mode: 'board', pgn: '1. e4', cursor: E4 };

describe('initialMovesEditor', () => {
  it('starts the PGN tab without a cursor', () => {
    expect(initialMovesEditor('pgn', '1. e4')).toEqual({ mode: 'pgn', pgn: '1. e4' });
  });

  it('starts the board tab with no cursor reported yet', () => {
    expect(initialMovesEditor('board', '1. e4')).toEqual({
      mode: 'board',
      pgn: '1. e4',
      cursor: null,
    });
  });
});

describe('movesEditorReducer', () => {
  describe('switchMode', () => {
    it('drops the cursor when leaving the board', () => {
      const next = movesEditorReducer(BOARD_MODE, { type: 'switchMode', mode: 'pgn' });
      expect(next).toEqual({ mode: 'pgn', pgn: '1. e4' });
      expect('cursor' in next).toBe(false);
    });

    it('enters the board with no cursor, keeping the PGN', () => {
      expect(movesEditorReducer(PGN_MODE, { type: 'switchMode', mode: 'board' })).toEqual({
        mode: 'board',
        pgn: '1. e4',
        cursor: null,
      });
    });

    it('does not resurrect the cursor from before a board → PGN → board round trip', () => {
      const back = [
        { type: 'switchMode', mode: 'pgn' } as const,
        { type: 'switchMode', mode: 'board' } as const,
      ].reduce(movesEditorReducer, BOARD_MODE);
      expect(back).toEqual({ mode: 'board', pgn: '1. e4', cursor: null });
    });

    it('returns the same state object when the mode is already active', () => {
      expect(movesEditorReducer(PGN_MODE, { type: 'switchMode', mode: 'pgn' })).toBe(PGN_MODE);
      expect(movesEditorReducer(BOARD_MODE, { type: 'switchMode', mode: 'board' })).toBe(
        BOARD_MODE
      );
    });
  });

  describe('editPgn', () => {
    it('replaces the PGN in PGN mode', () => {
      expect(movesEditorReducer(PGN_MODE, { type: 'editPgn', pgn: '1. d4' })).toEqual({
        mode: 'pgn',
        pgn: '1. d4',
      });
    });

    it('replaces the PGN in board mode, leaving the cursor to the builder', () => {
      expect(movesEditorReducer(BOARD_MODE, { type: 'editPgn', pgn: '1. e4 e5' })).toEqual({
        mode: 'board',
        pgn: '1. e4 e5',
        cursor: E4,
      });
    });

    it('returns the same state object for an unchanged PGN', () => {
      expect(movesEditorReducer(BOARD_MODE, { type: 'editPgn', pgn: '1. e4' })).toBe(BOARD_MODE);
    });
  });

  describe('moveCursor', () => {
    it('moves the cursor in board mode', () => {
      expect(movesEditorReducer(BOARD_MODE, { type: 'moveCursor', cursor: E5 })).toEqual({
        mode: 'board',
        pgn: '1. e4',
        cursor: E5,
      });
    });

    it('clears the cursor when the builder returns to the root', () => {
      expect(movesEditorReducer(BOARD_MODE, { type: 'moveCursor', cursor: null })).toEqual({
        mode: 'board',
        pgn: '1. e4',
        cursor: null,
      });
    });

    it('ignores a cursor report in PGN mode', () => {
      expect(movesEditorReducer(PGN_MODE, { type: 'moveCursor', cursor: E4 })).toBe(PGN_MODE);
    });

    it('returns the same state object for an equal cursor', () => {
      expect(movesEditorReducer(BOARD_MODE, { type: 'moveCursor', cursor: { ...E4 } })).toBe(
        BOARD_MODE
      );
    });
  });
});
