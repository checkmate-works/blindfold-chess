import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameStats } from '@/lib/games/compute-game-stats';
import type { Game } from '@/lib/games/saved-game-types';

import { useGameExpGrant } from './use-game-exp-grant';

const mockSaveGameResult = vi.fn();
vi.mock('../_actions/save-game-result', () => ({
  saveGameResult: (...args: unknown[]) => mockSaveGameResult(...args),
}));

const mockCaptureError = vi.fn();
vi.mock('@/lib/sentry/capture-error', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

const game = {
  status: 'win',
  engineConfig: { kind: 'stockfish', skillLevel: 5 },
} as unknown as Game;
const stats = { totalMoves: 20, aidedMoves: 2 } as GameStats;

function renderGrant() {
  return renderHook(() =>
    useGameExpGrant({ gameId: 'g1', game, stats, isAuthenticated: true, initialExp: null })
  );
}

describe('useGameExpGrant', () => {
  beforeEach(() => {
    mockSaveGameResult.mockReset();
    mockCaptureError.mockReset();
  });

  it('shows the granted Exp', async () => {
    const exp = { amount: 30 };
    mockSaveGameResult.mockResolvedValue({ success: true, exp });

    const { result } = renderGrant();

    await waitFor(() => expect(result.current).toEqual(exp));
    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  it('reports a failed grant without surfacing it to the screen', async () => {
    const error = new Error('network down');
    mockSaveGameResult.mockRejectedValue(error);

    const { result } = renderGrant();

    await waitFor(() =>
      expect(mockCaptureError).toHaveBeenCalledWith(error, '[useGameExpGrant] saveGameResult')
    );
    expect(result.current).toBeNull();
  });
});
