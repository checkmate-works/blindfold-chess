import { generatePgn, replayMoves, toPositionKey } from '@blindfold-chess/features/chess-core';
import { describe, expect, it } from 'vitest';

import type { ScannableLine } from './line-position-scan';
import { scanLinesForPositionKeys } from './line-position-scan';

function line(lineNo: number, moves: string[], startingFen?: string): ScannableLine {
  return {
    lineNo,
    pgn: generatePgn(moves, startingFen),
    startingFen: startingFen ?? null,
  };
}

/** The position key after the given prefix of moves. */
function keyAfter(moves: string[], startingFen?: string): string {
  const positions = replayMoves(moves, startingFen);
  return toPositionKey(positions[positions.length - 1].fen);
}

// Transposing pair (same as line-transpositions.test.ts): both reach
// "1.Nf3 d5 2.g3 c5 3.Bg2 e6 4.b3", L5 via 2...e6 3.Bg2 c5 first.
const L3_MOVES = ['Nf3', 'd5', 'g3', 'c5', 'Bg2', 'e6', 'b3'];
const L5_MOVES = ['Nf3', 'd5', 'g3', 'e6', 'Bg2', 'c5', 'b3', 'Nc6', 'Bb2'];

describe('scanLinesForPositionKeys', () => {
  it('resolves a key to the (lineNo, ply) that reaches it', () => {
    const key = keyAfter(L3_MOVES.slice(0, 4));
    const found = scanLinesForPositionKeys([line(3, L3_MOVES)], [key]);
    expect(found.get(key)).toEqual({ lineNo: 3, ply: 4 });
  });

  it('resolves multiple keys across lines in one scan', () => {
    const inLine1 = keyAfter(['e4', 'e5', 'Nf3']);
    const inLine2 = keyAfter(['d4', 'd5']);
    const found = scanLinesForPositionKeys(
      [line(1, ['e4', 'e5', 'Nf3', 'Nc6']), line(2, ['d4', 'd5', 'c4'])],
      [inLine1, inLine2]
    );
    expect(found.get(inLine1)).toEqual({ lineNo: 1, ply: 3 });
    expect(found.get(inLine2)).toEqual({ lineNo: 2, ply: 2 });
  });

  it('prefers the first line in the given order when both reach the position', () => {
    // The transposed tabiya exists in both lines; the scan order decides.
    const key = keyAfter(L3_MOVES);
    const found = scanLinesForPositionKeys([line(5, L5_MOVES), line(3, L3_MOVES)], [key]);
    expect(found.get(key)).toEqual({ lineNo: 5, ply: 7 });
  });

  it('omits a key no line reaches (orphaned link)', () => {
    const unreached = keyAfter(['a4']);
    const found = scanLinesForPositionKeys([line(1, ['e4', 'e5'])], [unreached]);
    expect(found.has(unreached)).toBe(false);
  });

  it('never matches the start position (ply 0 is not linkable)', () => {
    const start = keyAfter([]);
    const found = scanLinesForPositionKeys([line(1, ['e4', 'e5'])], [start]);
    expect(found.has(start)).toBe(false);
  });

  it('skips an unparsable line and keeps scanning', () => {
    const key = keyAfter(['e4']);
    const broken: ScannableLine = { lineNo: 1, pgn: '1. zz9 ??', startingFen: null };
    const found = scanLinesForPositionKeys([broken, line(2, ['e4'])], [key]);
    expect(found.get(key)).toEqual({ lineNo: 2, ply: 1 });
  });

  it('respects a custom starting FEN', () => {
    // A king-and-pawn endgame study line.
    const fen = '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1';
    const key = keyAfter(['Kd3'], fen);
    const found = scanLinesForPositionKeys([line(1, ['Kd3', 'Kd5'], fen)], [key]);
    expect(found.get(key)).toEqual({ lineNo: 1, ply: 1 });
  });
});
