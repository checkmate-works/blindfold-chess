import { describe, expect, it } from 'vitest';

import { buildMovetext, buildSystemPrompt, buildUserPrompt } from './prompt';

describe('buildMovetext', () => {
  it('numbers moves from the standard start', () => {
    expect(buildMovetext(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])).toBe('1. e4 e5 2. Nf3 Nc6 3. Bb5');
  });

  it('honors a black-to-move custom start', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 10';
    expect(buildMovetext(['e5', 'Nf3', 'Nc6'], fen)).toBe('10... e5 11. Nf3 Nc6');
  });
});

describe('prompts', () => {
  it('pins the output language and the engine-authority rules', () => {
    const system = buildSystemPrompt('Japanese');
    expect(system).toContain('Write ALL output text in Japanese');
    expect(system).toContain('ground truth');
  });

  it('serializes the facts block without any author-editable text', () => {
    const user = buildUserPrompt(
      {
        playerColor: 'white',
        result: 'win',
        engineKind: 'stockfish',
        engineElo: 1500,
        openingName: 'Italian Game',
        language: 'English',
      },
      '1. e4 e5',
      {
        moments: [],
        summaryStats: {
          totalPlies: 2,
          playerColor: 'white',
          avgCpLossPlayer: 12,
          judgmentCountsPlayer: { best: 1, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
        },
      }
    );

    expect(user).toContain('Player color: white');
    expect(user).toContain('approximate Elo 1500');
    expect(user).toContain('Italian Game');
    expect(user).toContain('1. e4 e5');
  });
});
