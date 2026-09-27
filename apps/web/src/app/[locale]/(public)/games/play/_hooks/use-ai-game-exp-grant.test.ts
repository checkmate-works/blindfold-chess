import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EngineConfig } from '@/lib/engines';
import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { useAiGameExpGrant } from './use-ai-game-exp-grant';

const mockSaveGameResult = vi.fn();
vi.mock('../result/_actions/save-game-result', () => ({
  saveGameResult: (...args: unknown[]) => mockSaveGameResult(...args),
}));

const mockCaptureError = vi.fn();
vi.mock('@/lib/sentry/capture-error', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

vi.mock('@/lib/games/compute-game-stats', () => ({
  computeGameStats: () => ({ totalMoves: 20, aidedMoves: 0 }),
}));

function renderGrant() {
  return renderHook(() =>
    useAiGameExpGrant({
      isFinishedView: false,
      isFinished: true,
      gameId: 'g1',
      isAuthenticated: true,
      playerResult: 'win',
      operationLogs: [] as MoveOperationLog[],
      engineConfig: { kind: 'stockfish', skillLevel: 5 } as EngineConfig,
    })
  );
}

describe('useAiGameExpGrant', () => {
  beforeEach(() => {
    mockSaveGameResult.mockReset();
    mockCaptureError.mockReset();
  });

  it('grants once for a finished game', async () => {
    mockSaveGameResult.mockResolvedValue({ success: true });

    renderGrant();

    await waitFor(() => expect(mockSaveGameResult).toHaveBeenCalledTimes(1));
    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  it('reports a failed grant instead of dropping it silently', async () => {
    const error = new Error('network down');
    mockSaveGameResult.mockRejectedValue(error);

    renderGrant();

    await waitFor(() =>
      expect(mockCaptureError).toHaveBeenCalledWith(error, '[useAiGameExpGrant] saveGameResult')
    );
  });
});
