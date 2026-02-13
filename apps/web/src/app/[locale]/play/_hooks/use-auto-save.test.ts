// @vitest-environment jsdom
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoSave } from './use-auto-save';

// Mock dependencies
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/en/play'),
}));

// Mock repositories

const { mockSave, mockUpdate, mockCreate } = vi.hoisted(() => ({
  mockSave: vi.fn().mockResolvedValue('new-game-id'),
  mockUpdate: vi.fn().mockResolvedValue(undefined),
  mockCreate: vi.fn().mockResolvedValue('new-game-id'),
}));

vi.mock('@/lib/repositories', () => {
  return {
    LocalStorageGameRepository: class {
      save = mockSave;
      update = mockUpdate;
      create = mockCreate;
      load = vi.fn();
    },
  };
});

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  const defaultProps = {
    moves: [] as AlgebraicNotation[],
    playerColor: 'white' as const,
    skillLevel: 1,
    status: 'in_progress' as const,
    enabled: true,
    saveOnInit: false,
  };

  it('should not auto-save when enabled transitions from false to true with existing moves (loading scenario)', async () => {
    // 1. Initial render with enabled=false (simulating loading state)
    // and some existing moves (loaded from storage)
    const { rerender } = renderHook((props) => useAutoSave(props), {
      initialProps: {
        ...defaultProps,
        moves: ['e4'] as AlgebraicNotation[],
        enabled: false,
        gameId: 'existing-id',
      },
    });

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();

    // 2. Transition to enabled=true (simulating load complete)
    // The moves are the same as what was "loaded"
    rerender({
      ...defaultProps,
      moves: ['e4'] as AlgebraicNotation[],
      enabled: true,
      gameId: 'existing-id',
    });

    // Should NOT save because of the protection logic we added
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should auto-save regularly when enabled from start', async () => {
    // 1. Initial render with enabled=true and no moves
    const { rerender } = renderHook((props) => useAutoSave(props), {
      initialProps: {
        ...defaultProps,
        moves: [] as AlgebraicNotation[],
        enabled: true,
      },
    });

    // 2. Add a move
    rerender({
      ...defaultProps,
      moves: ['e4'] as AlgebraicNotation[],
      enabled: true,
    });

    // Should create new game
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  it('should sync state when disabled', async () => {
    // 1. Initial render with enabled=true
    const { rerender } = renderHook((props) => useAutoSave(props), {
      initialProps: {
        ...defaultProps,
        moves: ['e4'] as AlgebraicNotation[],
        enabled: true,
        gameId: 'id-1',
      },
    });

    // Clear initial calls
    mockUpdate.mockClear();

    // 2. Disable auto-save and change moves
    rerender({
      ...defaultProps,
      moves: ['e4', 'e5'] as AlgebraicNotation[],
      enabled: false, // Disabled
      gameId: 'id-1',
    });

    // Should NOT save
    expect(mockUpdate).not.toHaveBeenCalled();

    // 3. Re-enable auto-save with same moves
    rerender({
      ...defaultProps,
      moves: ['e4', 'e5'] as AlgebraicNotation[],
      enabled: true,
      gameId: 'id-1',
    });

    // Should NOT save because state was synced while disabled/transitioning
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
