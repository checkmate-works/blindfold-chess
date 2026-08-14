import { describe, expect, it } from 'vitest';

import { deriveMoveAnalyses } from './derive-move-analyses';
import type { PositionEvaluation } from './types';

// 1. e4 e5 2. Nf3 — three plies of the standard start.
const MOVES = ['e4', 'e5', 'Nf3'];

function evals(entries: Array<Partial<PositionEvaluation>>): PositionEvaluation[] {
  return entries.map((e) => ({ score: 0, ...e }));
}

describe('deriveMoveAnalyses', () => {
  it('derives color, move numbers, and SAN from the game record, not the payload', () => {
    const analyses = deriveMoveAnalyses(
      MOVES,
      undefined,
      evals([{ score: 30 }, { score: 25 }, { score: 35 }, { score: 30 }])
    );

    expect(analyses).toHaveLength(3);
    expect(analyses[0]).toMatchObject({ ply: 0, san: 'e4', color: 'white', moveNumber: 1 });
    expect(analyses[1]).toMatchObject({ ply: 1, san: 'e5', color: 'black', moveNumber: 1 });
    expect(analyses[2]).toMatchObject({ ply: 2, san: 'Nf3', color: 'white', moveNumber: 2 });
  });

  it('computes cp loss in the mover perspective and floors it at 0', () => {
    const analyses = deriveMoveAnalyses(
      MOVES,
      undefined,
      // White's e4 drops 30→-70 (loss 100); Black's e5 moves -70→-90, which
      // GAINS 20 for black → floored to 0; White's Nf3 -90→-440 (loss 350).
      evals([{ score: 30 }, { score: -70 }, { score: -90 }, { score: -440 }])
    );

    expect(analyses[0].cpLoss).toBe(100);
    expect(analyses[0].judgment).toBe('inaccuracy');
    expect(analyses[1].cpLoss).toBe(0);
    expect(analyses[1].judgment).toBe('best');
    expect(analyses[2].cpLoss).toBe(350);
    expect(analyses[2].judgment).toBe('blunder');
  });

  it('forces cpLoss to 0 when the played move is the engine best move', () => {
    const analyses = deriveMoveAnalyses(
      MOVES,
      undefined,
      // Depth noise says e4 "lost" 80cp, but the engine's own choice was e2e4.
      evals([{ score: 100, bestMoveUci: 'e2e4' }, { score: 20 }, { score: 20 }, { score: 20 }])
    );

    expect(analyses[0].cpLoss).toBe(0);
    expect(analyses[0].judgment).toBe('best');
  });

  it('resolves bestMoveUci to SAN and drops illegal UCI silently', () => {
    const analyses = deriveMoveAnalyses(
      MOVES,
      undefined,
      evals([
        { score: 0, bestMoveUci: 'g1f3' }, // legal in the start position → Nf3
        { score: 0, bestMoveUci: 'e1e8' }, // illegal → null
        { score: 0, bestMoveUci: 'zz99' }, // garbage → null
        { score: 0 },
      ])
    );

    expect(analyses[0].bestMoveSan).toBe('Nf3');
    expect(analyses[1].bestMoveSan).toBeNull();
    expect(analyses[2].bestMoveSan).toBeNull();
  });

  it('clamps out-of-range scores to the engine saturation limit', () => {
    const analyses = deriveMoveAnalyses(
      ['e4'],
      undefined,
      evals([{ score: 999999 }, { score: -999999 }])
    );

    expect(analyses[0].evalBefore).toBe(10000);
    expect(analyses[0].evalAfter).toBe(-10000);
    expect(analyses[0].cpLoss).toBe(20000);
  });

  it('rejects a payload whose length does not match the move count', () => {
    expect(() => deriveMoveAnalyses(MOVES, undefined, evals([{ score: 0 }]))).toThrow(
      /does not match/
    );
  });

  it('respects a custom starting FEN for colors and move numbers', () => {
    // Black to move at fullmove 10.
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 10';
    const analyses = deriveMoveAnalyses(['e5'], fen, evals([{ score: 0 }, { score: 0 }]));

    expect(analyses[0].color).toBe('black');
    expect(analyses[0].moveNumber).toBe(10);
  });
});
