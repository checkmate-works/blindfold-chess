import type { Fen } from '@blindfold-chess/types';
import { describe, expect, it, vi } from 'vitest';

import { evaluatePositions } from './evaluate-positions';

function scriptedEvaluator(script?: (fen: Fen) => { score: number; bestMove?: string }) {
  const calls: Fen[] = [];
  return {
    calls,
    getEvaluation: vi.fn(async (fen: Fen) => {
      calls.push(fen);
      return script ? script(fen) : { score: 10, bestMove: 'e2e4' };
    }),
  };
}

describe('evaluatePositions', () => {
  it('evaluates every position and reports progress', async () => {
    const evaluator = scriptedEvaluator();
    const onProgress = vi.fn();

    const result = await evaluatePositions({
      moves: ['e4', 'e5', 'Nf3'],
      evaluator,
      onProgress,
    });

    expect(result).toHaveLength(4);
    expect(evaluator.getEvaluation).toHaveBeenCalledTimes(4);
    expect(onProgress).toHaveBeenCalledTimes(4);
    expect(onProgress).toHaveBeenLastCalledWith(4, 4);
    expect(result[0]).toEqual({ score: 10, bestMoveUci: 'e2e4' });
  });

  it('skips the engine on a checkmate final position and scores it for the winner', async () => {
    const evaluator = scriptedEvaluator();

    // Fool's mate — black delivers mate, so white (side to move) is mated.
    const result = await evaluatePositions({
      moves: ['f3', 'e5', 'g4', 'Qh4#'],
      evaluator,
    });

    expect(result).toHaveLength(5);
    // 4 non-terminal positions probed, the mated position synthesized.
    expect(evaluator.getEvaluation).toHaveBeenCalledTimes(4);
    expect(result[4]).toEqual({ score: -10000 });
  });

  it('aborts between positions via the signal', async () => {
    const controller = new AbortController();
    const evaluator = {
      getEvaluation: vi.fn(async () => {
        controller.abort();
        return { score: 0 };
      }),
    };

    await expect(
      evaluatePositions({
        moves: ['e4', 'e5'],
        evaluator,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(evaluator.getEvaluation).toHaveBeenCalledTimes(1);
  });

  it('refuses games beyond the ply ceiling upfront', async () => {
    const evaluator = scriptedEvaluator();
    await expect(evaluatePositions({ moves: Array(201).fill('e4'), evaluator })).rejects.toThrow(
      /exceeds/
    );
    expect(evaluator.getEvaluation).not.toHaveBeenCalled();
  });
});
