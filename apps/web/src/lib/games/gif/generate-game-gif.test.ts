import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import type { GameRecord } from '@/lib/db/schema';

const { generateGameGif } = await import('./generate-game-gif');

function buildGame(overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    id: '018f4b3e-0000-7000-8000-000000000000',
    authorId: null,
    title: 'Test game',
    description: null,
    moves: ['e4', 'e5', 'Nf3', 'Nc6'],
    startingFen: null,
    setupPlies: null,
    playerColor: 'white',
    engineConfig: { kind: 'stockfish', skillLevel: 5 },
    operationLogs: null,
    operationTotals: null,
    undoneLogs: null,
    playSettings: null,
    playSettingsLog: null,
    result: 'win',
    engineKind: 'stockfish',
    engineElo: 1200,
    moveCount: 4,
    cleanRate: null,
    status: 'public',
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as GameRecord;
}

describe('generateGameGif', () => {
  it('returns a buffer starting with the GIF89a magic bytes', async () => {
    const buf = await generateGameGif(buildGame(), 'plain');
    expect(buf.subarray(0, 6).toString('ascii')).toBe('GIF89a');
  });

  it('produces one frame per replayed position (initial position + each move)', async () => {
    const game = buildGame();
    const buf = await generateGameGif(game, 'plain');
    const meta = await sharp(buf, { animated: true }).metadata();
    expect(meta.pages).toBe(game.moves.length + 1);
  });

  // Regression: a 'played' GIF for a peek-mode game with an asymmetric
  // pieceShapeMode (one side shown as Go stones) used to render every piece
  // as a translucent ghost, because `playSettingsToThumbnailDisplay` folded
  // `boardVisibility: 'peek'` into hide-both-sides regardless of
  // `pieceShapeMode`. This only asserts the GIF still renders without error
  // for this combination — the settings-folding behavior itself is covered
  // by `play-settings-thumbnail.test.ts`.
  it('renders a "played" GIF for a peek-mode game with an asymmetric piece shape', async () => {
    const game = buildGame({
      playSettings: {
        boardVisibility: 'peek',
        showOwnPieces: true,
        showOpponentPieces: false,
        pieceShapeMode: 'circles-own',
        pieceColors: 'normal',
        pawnHideMode: 'none',
      },
    });
    const buf = await generateGameGif(game, 'played');
    expect(buf.subarray(0, 6).toString('ascii')).toBe('GIF89a');
    const meta = await sharp(buf, { animated: true }).metadata();
    expect(meta.pages).toBe(game.moves.length + 1);
  });

  // Regression: 'played' used to apply the start-of-game playSettings
  // snapshot to every frame, so a game that revealed its board partway
  // through (playSettingsLog) rendered every frame hidden. This only asserts
  // the whole-game generation completes without error for a log-bearing
  // game; the per-frame folding itself is covered by
  // play-settings-thumbnail.test.ts.
  it('renders a "played" GIF for a game whose board visibility changes mid-game via playSettingsLog', async () => {
    const game = buildGame({
      playSettings: {
        boardVisibility: 'never',
        showOwnPieces: true,
        showOpponentPieces: true,
        pieceShapeMode: 'normal',
        pieceColors: 'normal',
        pawnHideMode: 'none',
      },
      playSettingsLog: [{ atMoveIndex: 2, key: 'boardVisibility', to: 'always' }],
    });
    const buf = await generateGameGif(game, 'played');
    expect(buf.subarray(0, 6).toString('ascii')).toBe('GIF89a');
    const meta = await sharp(buf, { animated: true }).metadata();
    expect(meta.pages).toBe(game.moves.length + 1);
  });
});
