import { err, ok } from '@blindfold-chess/features/ai-game/opponent';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAiMoveOrchestration } from './use-ai-move-orchestration';

/** Standard start, White (the player) has moved — it is the AI's turn. */
const MOVES = ['e4'] as AlgebraicNotation[];

function baseOptions() {
  return {
    shouldMakeAiMove: true,
    gameStatus: 'in_progress' as const,
    moves: MOVES,
    playerSide: 'white' as const,
    startingFen: undefined,
    onAiMoveSuccess: vi.fn(),
    onAiMoveError: vi.fn(),
  };
}

describe('useAiMoveOrchestration', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('delivers the move to onAiMoveSuccess', async () => {
    const options = {
      ...baseOptions(),
      getAiMove: vi.fn().mockResolvedValue(ok('e5' as AlgebraicNotation)),
    };
    renderHook(() => useAiMoveOrchestration(options));

    await waitFor(() => expect(options.onAiMoveSuccess).toHaveBeenCalledWith('e5'));
    expect(options.onAiMoveError).not.toHaveBeenCalled();
  });

  it('waits out a busy engine and retries the same request', async () => {
    const options = {
      ...baseOptions(),
      getAiMove: vi
        .fn()
        .mockResolvedValueOnce(err({ kind: 'busy' }))
        .mockResolvedValueOnce(err({ kind: 'busy' }))
        .mockResolvedValue(ok('e5' as AlgebraicNotation)),
    };
    renderHook(() => useAiMoveOrchestration(options));

    await waitFor(() => expect(options.onAiMoveSuccess).toHaveBeenCalledWith('e5'), {
      timeout: 3000,
    });
    expect(options.getAiMove).toHaveBeenCalledTimes(3);
    expect(options.onAiMoveError).not.toHaveBeenCalled();
  });

  it('treats a non-busy failure as final and reports it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const options = {
      ...baseOptions(),
      getAiMove: vi
        .fn()
        .mockResolvedValue(err({ kind: 'move-generation-failed', cause: new Error('boom') })),
    };
    renderHook(() => useAiMoveOrchestration(options));

    await waitFor(() => expect(options.onAiMoveError).toHaveBeenCalledTimes(1));
    expect(options.getAiMove).toHaveBeenCalledTimes(1);
    expect(options.onAiMoveSuccess).not.toHaveBeenCalled();
  });

  it('treats not-initialized as final (no busy-wait loop)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const options = {
      ...baseOptions(),
      getAiMove: vi.fn().mockResolvedValue(err({ kind: 'not-initialized' })),
    };
    renderHook(() => useAiMoveOrchestration(options));

    await waitFor(() => expect(options.onAiMoveError).toHaveBeenCalledTimes(1));
    expect(options.getAiMove).toHaveBeenCalledTimes(1);
  });

  it('contains an unexpected getAiMove rejection instead of leaking it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const options = {
      ...baseOptions(),
      getAiMove: vi.fn().mockRejectedValue(new Error('unexpected')),
    };
    renderHook(() => useAiMoveOrchestration(options));

    await waitFor(() => expect(options.onAiMoveError).toHaveBeenCalledTimes(1));
    expect(options.onAiMoveSuccess).not.toHaveBeenCalled();
  });

  it('does nothing when it is not the AI turn', async () => {
    const options = {
      ...baseOptions(),
      moves: [] as AlgebraicNotation[], // White (the player) to move
      getAiMove: vi.fn(),
    };
    renderHook(() => useAiMoveOrchestration(options));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(options.getAiMove).not.toHaveBeenCalled();
  });
});
