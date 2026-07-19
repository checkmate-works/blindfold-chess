import { describe, expect, it } from 'vitest';

import { formatChangeLogMoveLabel } from './format-change-log-move-label';

describe('formatChangeLogMoveLabel', () => {
  it('returns null when the change was recorded before the first move', () => {
    expect(formatChangeLogMoveLabel(0, undefined)).toBeNull();
  });

  it('returns null for a negative atMoveIndex', () => {
    expect(formatChangeLogMoveLabel(-1, undefined)).toBeNull();
  });

  it('anchors to white’s move when 1 half-move has been played', () => {
    // atMoveIndex=1 means white's move 1 (ply 0) was just played.
    expect(formatChangeLogMoveLabel(1, undefined)).toBe('1.');
  });

  it('anchors to black’s move when 2 half-moves have been played', () => {
    // atMoveIndex=2 means black's move 1 (ply 1) was just played.
    expect(formatChangeLogMoveLabel(2, undefined)).toBe('1...');
  });

  it('matches the user-reported example: atMoveIndex=52 anchors to 26...', () => {
    // 52 half-moves played = black's 26th move (ply 51, 0-based).
    expect(formatChangeLogMoveLabel(52, undefined)).toBe('26...');
  });

  it('accounts for a starting FEN where black moves first', () => {
    const blackStartFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    // ply 0 is black's move here.
    expect(formatChangeLogMoveLabel(1, blackStartFen)).toBe('1...');
  });

  it('accounts for a starting FEN with a non-1 fullmove number', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 5';
    // ply 0 here is white's move, labeled with the FEN's starting move number.
    expect(formatChangeLogMoveLabel(1, fen)).toBe('5.');
  });
});
