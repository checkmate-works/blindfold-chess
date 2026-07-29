import { describe, expect, it } from 'vitest';

import type { Game } from '@/lib/games/saved-game-types';

import { toGameFrameSource } from './to-game-frame-source';

function buildGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'local-1',
    date: '2026-07-29T00:00:00.000Z',
    moves: ['e4', 'e5'],
    playerColor: 'white',
    engineConfig: { kind: 'stockfish', skillLevel: 3 },
    status: 'win',
    ...overrides,
  };
}

describe('toGameFrameSource', () => {
  it('maps a finished local game onto the frame builder’s input', () => {
    const source = toGameFrameSource(
      buildGame({ startingFen: '8/8/8/8/8/8/8/K6k w - - 0 1', setupPlies: 2, status: 'loss' })
    );

    expect(source).toMatchObject({
      moves: ['e4', 'e5'],
      startingFen: '8/8/8/8/8/8/8/K6k w - - 0 1',
      setupPlies: 2,
      playerColor: 'white',
      result: 'loss',
    });
  });

  it('normalizes absent optional fields to null rather than undefined', () => {
    const source = toGameFrameSource(buildGame());

    expect(source.startingFen).toBeNull();
    expect(source.setupPlies).toBeNull();
    expect(source.playSettings).toBeNull();
    expect(source.operationLogs).toBeNull();
    expect(source.undoneLogs).toBeNull();
  });

  it('carries undoneLogs, which the review view model does not', () => {
    // They drive the undo-reenactment frames, so dropping them would silently
    // cost the preview the annotations the "as played" GIF is sold on.
    const undoneLogs = [
      {
        index: 1,
        sans: ['Nf3'],
        log: { inputMethod: 'board' as const, peekCount: 0, undoCount: 1, movePeekCount: 0 },
      },
    ];
    expect(toGameFrameSource(buildGame({ undoneLogs })).undoneLogs).toEqual(undoneLogs);
  });

  it('narrows the preference log to the display subset, dropping input-assist keys', () => {
    const source = toGameFrameSource(
      buildGame({
        preferenceChangeLog: [
          { atMoveIndex: 4, key: 'boardVisibility', from: 'never', to: 'always' },
          { atMoveIndex: 6, key: 'moveInputMode', from: 'text', to: 'button' },
        ],
      })
    );

    // Same projection the publish path applies — the preview must fold exactly
    // what the published game will carry.
    expect(source.playSettingsLog).toEqual([
      { atMoveIndex: 4, key: 'boardVisibility', to: 'always' },
    ]);
  });
});
