import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

import type { GameRecord } from '@/lib/db/schema';

vi.mock('server-only', () => ({}));

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
});
