import { describe, expect, it } from 'vitest';

import type { GamePlaySettings } from '@/lib/games/saved-game-types';

import type { BlindfoldContext } from './blindfold-context';
import type { ReviewPromptMeta } from './prompt';
import { buildMovetext, buildSystemPrompt, buildUserPrompt } from './prompt';

const META: ReviewPromptMeta = {
  playerColor: 'white',
  result: 'win',
  engineKind: 'stockfish',
  engineElo: 1500,
  openingName: 'Italian Game',
  language: 'English',
};

const INPUT = {
  moments: [],
  summaryStats: {
    totalPlies: 2,
    playerColor: 'white' as const,
    avgCpLossPlayer: 12,
    judgmentCountsPlayer: { best: 1, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
  },
};

const HIDDEN: GamePlaySettings = {
  boardVisibility: 'never',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

function blindfold(overrides: Partial<BlindfoldContext> = {}): BlindfoldContext {
  return {
    start: HIDDEN,
    changedMidGame: false,
    totals: { peeks: 2, hints: 0, undos: 1, illegalAttempts: 5 },
    erasedByUndo: { peeks: 1, hints: 0, illegalAttempts: 2 },
    lateGameDecline: false,
    moments: [
      {
        ply: 40,
        visibility: 'never',
        aid: { peeks: 0, hints: 0, undos: 0, illegalAttempts: 3 },
        rejectedMoves: ['Bf4', 'Nd7'],
        signals: ['board_image_drift'],
      },
    ],
    ...overrides,
  };
}

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
    const system = buildSystemPrompt('Japanese', null);
    expect(system).toContain('Write ALL output text in Japanese');
    expect(system).toContain('ground truth');
    expect(system).toContain('advice 1-3');
    expect(system).toContain('- develop_before_attacking:');
    expect(system).toContain('- other:');
    expect(system).toContain('never write the principle id');
  });

  it('lists blindfold principles only for a blindfold game', () => {
    expect(buildSystemPrompt('English', null)).not.toContain('recount_after_captures');
    expect(buildSystemPrompt('English', blindfold())).toContain('- recount_after_captures:');
  });

  it('serializes the facts block without any author-editable text', () => {
    const user = buildUserPrompt(META, '1. e4 e5', INPUT, null);

    expect(user).toContain('Player color: white');
    expect(user).toContain('approximate Elo 1500');
    expect(user).toContain('Italian Game');
    expect(user).toContain('1. e4 e5');
  });

  it('says nothing about blindfold play when there is no blindfold context', () => {
    expect(buildSystemPrompt('English', null)).not.toMatch(/blindfold/i);
    expect(buildUserPrompt(META, '1. e4 e5', INPUT, null)).not.toMatch(/blindfold/i);
  });
});

describe('blindfold prompts', () => {
  it('adds the vocabulary and the rules for the starting visibility', () => {
    const never = buildSystemPrompt('English', blindfold());
    expect(never).toContain('"rejected move"');
    expect(never).toContain('board_image_drift');
    expect(never).toContain('The board was never shown');
    expect(never).toContain('Never attribute a peek, hint, or takeback to a critical moment');
    expect(never).not.toContain('could be peeked');

    const peek = buildSystemPrompt(
      'English',
      blindfold({ start: { ...HIDDEN, boardVisibility: 'peek' } })
    );
    expect(peek).toContain('could be peeked');
    expect(peek).not.toContain('The board was never shown');

    const disguised = buildSystemPrompt(
      'English',
      blindfold({ start: { ...HIDDEN, boardVisibility: 'always', pieceShapeMode: 'circles-all' } })
    );
    expect(disguised).toContain('visible but disguised');
  });

  it('states the conditions, the totals, what undo erased, and the per-moment aid usage', () => {
    const user = buildUserPrompt(META, '1. e4 e5', INPUT, blindfold());

    expect(user).toContain('At the start: board hidden for the whole game (never shown).');
    expect(user).toContain('peeks 2, hints 0, takebacks 1, rejected moves 5.');
    expect(user).toContain('removed from the per-move record by takebacks');
    expect(user).toContain('"ply":40');
    expect(user).toContain('"rejectedMoves":["Bf4","Nd7"]');
    expect(user).toContain('"signals":["board_image_drift"]');
    expect(user).not.toContain('changed during the game');
    expect(user).not.toContain('fell off');
  });

  it('describes every partial-sight setting and the optional flags', () => {
    const user = buildUserPrompt(
      META,
      '1. e4 e5',
      INPUT,
      blindfold({
        start: {
          boardVisibility: 'always',
          showOwnPieces: false,
          showOpponentPieces: true,
          pieceShapeMode: 'circles-opponent',
          pieceColors: 'white-only',
          pawnHideMode: 'own',
        },
        changedMidGame: true,
        lateGameDecline: true,
        erasedByUndo: { peeks: 0, hints: 0, illegalAttempts: 0 },
        moments: [],
      })
    );

    expect(user).toContain(
      'At the start: board shown; own pieces hidden; opponent pieces drawn as identical stones (type not visible); all pieces drawn white (side not visible); own pawns hidden.'
    );
    expect(user).toContain('changed during the game');
    expect(user).toContain('fell off markedly');
    // Nothing was erased, so the line is omitted rather than printed as zeros.
    expect(user).not.toContain('removed from the per-move record');
    expect(user).not.toContain('Aid usage while choosing');
  });
});
