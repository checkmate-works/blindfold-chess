import { describe, expect, it } from 'vitest';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

import { type SessionState, evaluatePuzzleSubmit, parseSolutionLines } from './puzzle-match';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function line(...sans: string[]): PuzzleSolutionMove[] {
  return sans.map((san) => ({ san, note: null }) as PuzzleSolutionMove);
}

function initialSession(fen = START_FEN): SessionState {
  return {
    currentFen: fen,
    playerMoves: [],
    lockedSolutionIndex: null,
    attempts: [],
    lastOpponentMove: null,
  };
}

describe('parseSolutionLines', () => {
  it('splits each line into all moves and the even-index player slots', () => {
    const parsed = parseSolutionLines([line('e4', 'e5', 'Nf3')]);
    expect(parsed[0]!.moves).toEqual(['e4', 'e5', 'Nf3']);
    expect(parsed[0]!.playerSlots).toEqual(['e4', 'Nf3']);
  });
});

describe('evaluatePuzzleSubmit', () => {
  const solutions = [line('e4', 'e5', 'Nf3'), line('d4', 'd5', 'Nc3')];
  const parsed = parseSolutionLines(solutions);

  it('rejects an illegal move and records the attempt', () => {
    const outcome = evaluatePuzzleSubmit(initialSession(), 'Zz9', parsed, solutions);
    expect(outcome.kind).toBe('rejected');
    if (outcome.kind !== 'rejected') throw new Error('unreachable');
    expect(outcome.nextSession.attempts).toEqual([{ move: 'Zz9', isCorrect: false }]);
    expect(outcome.nextSession.currentFen).toBe(START_FEN);
  });

  it('rejects a legal but non-solution move', () => {
    const outcome = evaluatePuzzleSubmit(initialSession(), 'h3', parsed, solutions);
    expect(outcome.kind).toBe('rejected');
    if (outcome.kind !== 'rejected') throw new Error('unreachable');
    expect(outcome.nextSession.attempts).toEqual([{ move: 'h3', isCorrect: false }]);
  });

  it('accepts a correct first move, locks the line, and auto-plays the reply', () => {
    const outcome = evaluatePuzzleSubmit(initialSession(), 'e4', parsed, solutions);
    expect(outcome.kind).toBe('accepted');
    if (outcome.kind !== 'accepted') throw new Error('unreachable');
    expect(outcome.nextSession.lockedSolutionIndex).toBe(0);
    expect(outcome.nextSession.playerMoves).toEqual(['e4']);
    expect(outcome.nextSession.lastOpponentMove).toBe('e5');
    expect(outcome.solve).toBeNull();
  });

  it('locks onto the second line when its first move is played', () => {
    const outcome = evaluatePuzzleSubmit(initialSession(), 'd4', parsed, solutions);
    if (outcome.kind !== 'accepted') throw new Error('expected accepted');
    expect(outcome.nextSession.lockedSolutionIndex).toBe(1);
    expect(outcome.nextSession.lastOpponentMove).toBe('d5');
  });

  it('marks the puzzle solved on the final player move', () => {
    const first = evaluatePuzzleSubmit(initialSession(), 'e4', parsed, solutions);
    if (first.kind !== 'accepted') throw new Error('expected accepted');
    const second = evaluatePuzzleSubmit(first.nextSession, 'Nf3', parsed, solutions);
    if (second.kind !== 'accepted') throw new Error('expected accepted');
    expect(second.solve).toEqual({
      solutionLine: 'e4 e5 Nf3',
      attempts: second.nextSession.attempts,
      playerMoveCount: 2,
    });
  });

  it('restricts matching to the locked line after the first move', () => {
    const first = evaluatePuzzleSubmit(initialSession(), 'e4', parsed, solutions);
    if (first.kind !== 'accepted') throw new Error('expected accepted');
    // Nc3 is the line-1 second move; it must not match once line 0 is locked.
    const wrong = evaluatePuzzleSubmit(first.nextSession, 'Nc3', parsed, solutions);
    expect(wrong.kind).toBe('rejected');
  });

  it('matches regardless of check/mate decoration on either side', () => {
    // Scholar's mate position; white plays Qxf7#. The solution stores the
    // move without the `#`, the user types it with `#` — both canonicalize
    // through chess.js to the same SAN, so the move is accepted.
    const mateFen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    const mateSolutions = [line('Qxf7')];
    const mateParsed = parseSolutionLines(mateSolutions);
    const outcome = evaluatePuzzleSubmit(
      initialSession(mateFen),
      'Qxf7#',
      mateParsed,
      mateSolutions
    );
    expect(outcome.kind).toBe('accepted');
    if (outcome.kind !== 'accepted') throw new Error('unreachable');
    expect(outcome.solve?.solutionLine).toBe('Qxf7');
  });
});
