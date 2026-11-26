import { describe, expect, it } from 'vitest';

import { parseAiGameResultReport } from './ai-game-result-input';

const valid = {
  gameId: '3f2c1b9e-8a4d-4c6f-9b1a-2d3e4f5a6b7c',
  result: 'win',
  engine: { kind: 'stockfish', skillLevel: 5 },
  playerMoveCount: 30,
  aidedMoveCount: 4,
};

describe('parseAiGameResultReport', () => {
  it('accepts a well-formed report', () => {
    expect(parseAiGameResultReport(valid)).toEqual(valid);
  });

  it('rejects a payload that cannot be a game', () => {
    expect(parseAiGameResultReport(null)).toBeNull();
    expect(parseAiGameResultReport({ ...valid, gameId: '1795721643277' })).toBeNull();
    expect(parseAiGameResultReport({ ...valid, result: 'resigned' })).toBeNull();
    expect(parseAiGameResultReport({ ...valid, engine: { kind: 'stockfish' } })).toBeNull();
    expect(parseAiGameResultReport({ ...valid, engine: { kind: 'leela', rating: 1 } })).toBeNull();
  });

  it('clamps aided moves to the move count', () => {
    expect(parseAiGameResultReport({ ...valid, aidedMoveCount: 99 })?.aidedMoveCount).toBe(30);
    expect(parseAiGameResultReport({ ...valid, aidedMoveCount: -3 })?.aidedMoveCount).toBe(0);
  });

  it('reads unusable counts as zero moves', () => {
    const report = parseAiGameResultReport({ ...valid, playerMoveCount: 'many' });
    expect(report?.playerMoveCount).toBe(0);
    expect(report?.aidedMoveCount).toBe(0);
  });
});
