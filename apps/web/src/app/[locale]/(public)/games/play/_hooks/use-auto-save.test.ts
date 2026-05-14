// @vitest-environment jsdom
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoSave } from './use-auto-save';

// Mock dependencies
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/en/games/play'),
}));

// Mock repositories

const { mockUpdate, mockCreate, mockLoad } = vi.hoisted(() => ({
  mockUpdate: vi.fn().mockResolvedValue(undefined),
  mockCreate: vi.fn().mockResolvedValue('new-game-id'),
  mockLoad: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/games/local-storage-repository', () => {
  return {
    LocalStorageGameRepository: class {
      update = mockUpdate;
      create = mockCreate;
      load = mockLoad;
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
    engineConfig: { kind: 'stockfish' as const, skillLevel: 1 as const },
    status: 'in_progress' as const,
    enabled: true,
    saveOnInit: false,
    gameId: undefined as string | undefined,
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

    expect(mockCreate).not.toHaveBeenCalled();
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
    expect(mockCreate).not.toHaveBeenCalled();
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

  it('should NOT set toast flag when loading existing game and navigating away without new moves', async () => {
    // Scenario: User navigates to an existing game page.
    // The game is loaded (enabled transitions false -> true with existing moves),
    // then the user navigates away without making any new moves.
    // The toast should NOT appear because hasSavedInSession remains false
    // due to the isInitialSyncSave mechanism.

    // 1. Initial render with enabled=false (loading state), existing moves
    const { rerender, unmount } = renderHook((props) => useAutoSave(props), {
      initialProps: {
        ...defaultProps,
        moves: ['e4', 'e5'] as AlgebraicNotation[],
        enabled: false,
        gameId: 'existing-game-id',
      },
    });

    // 2. Transition to enabled=true (load complete)
    rerender({
      ...defaultProps,
      moves: ['e4', 'e5'] as AlgebraicNotation[],
      enabled: true,
      gameId: 'existing-game-id',
    });

    // No save should have been triggered
    await waitFor(() => {
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    // 3. Unmount (simulating navigation away)
    unmount();

    // Toast flag should NOT be set because hasSavedInSession is false
    expect(sessionStorage.getItem('blindfold_chess_show_save_toast')).toBeNull();
  });

  it('should set toast flag when new game with saveOnInit gets AI move and navigates away', async () => {
    // Scenario: User starts a new game (saveOnInit creates it),
    // then AI makes a move (moves increase), and user navigates away.
    // The toast SHOULD appear because hasSavedInSession is set by saveOnInit
    // and subsequent saves from AI moves also set it.

    mockCreate.mockResolvedValue('new-game-id');

    // 1. Initial render with saveOnInit=true, no gameId (new game)
    const { rerender, unmount } = renderHook((props) => useAutoSave(props), {
      initialProps: {
        ...defaultProps,
        moves: [] as AlgebraicNotation[],
        enabled: true,
        saveOnInit: true,
      },
    });

    // Wait for initial save (saveOnInit) to complete
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    // 2. AI makes a move (moves increase)
    rerender({
      ...defaultProps,
      moves: ['e4'] as AlgebraicNotation[],
      enabled: true,
      saveOnInit: true,
      gameId: 'new-game-id',
    });

    // Wait for auto-save from move change
    await waitFor(() => {
      // The create from saveOnInit + the save from AI move
      expect(mockCreate.mock.calls.length + mockUpdate.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    // 3. Unmount (simulating navigation away)
    unmount();

    // Toast flag SHOULD be set because hasSavedInSession was set by saveOnInit
    expect(sessionStorage.getItem('blindfold_chess_show_save_toast')).toBe('true');
  });

  it('should set toast flag when loaded game gets an additional move and navigates away', async () => {
    // Scenario: User navigates to an existing game with pre-loaded moves.
    // Since moves.length > 0 during the enabled transition, isInitialSyncSave
    // is NOT set. The additional move triggers a save that sets hasSavedInSession,
    // so the toast SHOULD appear on unmount.

    mockLoad.mockResolvedValue({
      moves: ['e4', 'e5'],
      playerColor: 'white',
      engineConfig: { kind: 'stockfish', skillLevel: 1 },
      status: 'in_progress',
    });

    // 1. Initial render with enabled=false (loading state)
    const { rerender, unmount } = renderHook((props) => useAutoSave(props), {
      initialProps: {
        ...defaultProps,
        moves: ['e4', 'e5'] as AlgebraicNotation[],
        enabled: false,
        gameId: 'existing-game-id',
      },
    });

    // 2. Transition to enabled=true (load complete)
    rerender({
      ...defaultProps,
      moves: ['e4', 'e5'] as AlgebraicNotation[],
      enabled: true,
      gameId: 'existing-game-id',
    });

    // No save should happen from the sync transition
    expect(mockUpdate).not.toHaveBeenCalled();

    // 3. One additional move
    rerender({
      ...defaultProps,
      moves: ['e4', 'e5', 'Nf3'] as AlgebraicNotation[],
      enabled: true,
      gameId: 'existing-game-id',
    });

    // Wait for auto-save to complete
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    // 4. Unmount (simulating navigation away)
    unmount();

    // Toast flag SHOULD be set because hasSavedInSession was set by the save
    expect(sessionStorage.getItem('blindfold_chess_show_save_toast')).toBe('true');
  });

  it('should NOT set toast flag in production loading flow when navigating away without new moves', async () => {
    // Scenario: Simulates the actual production multi-render flow:
    // 1. Start with enabled=false, moves=[] (component mounts while data loads)
    // 2. enabled transitions to true, moves still [] (isInitialSyncSave flag set)
    // 3. Moves update to loaded values (triggers sync save, consumes flag)
    // 4. User navigates away without making a new move
    // The toast should NOT appear because the sync save consumed isInitialSyncSave.

    mockCreate.mockResolvedValue('synced-game-id');

    // 1. Initial render: enabled=false, no moves (loading state)
    const { rerender, unmount } = renderHook((props) => useAutoSave(props), {
      initialProps: {
        ...defaultProps,
        moves: [] as AlgebraicNotation[],
        enabled: false,
        gameId: 'existing-game-id',
      },
    });

    // 2. enabled transitions to true, moves still empty
    // This sets isInitialSyncSave = true (because moves.length === 0)
    rerender({
      ...defaultProps,
      moves: [] as AlgebraicNotation[],
      enabled: true,
      gameId: 'existing-game-id',
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();

    // 3. Moves are loaded from storage (e.g., via setMovesTo)
    // This triggers a save which consumes the isInitialSyncSave flag
    mockLoad.mockResolvedValue({
      moves: ['e4', 'e5'],
      playerColor: 'white',
      engineConfig: { kind: 'stockfish', skillLevel: 1 },
      status: 'in_progress',
    });

    rerender({
      ...defaultProps,
      moves: ['e4', 'e5'] as AlgebraicNotation[],
      enabled: true,
      gameId: 'existing-game-id',
    });

    // Wait for sync save to complete
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    // 4. Unmount without any new moves (navigating away)
    unmount();

    // Toast should NOT be set because isInitialSyncSave consumed the save
    expect(sessionStorage.getItem('blindfold_chess_show_save_toast')).toBeNull();
  });

  it('should set toast flag in production loading flow when user makes a move after loading', async () => {
    // Scenario: Same production flow as above, but the user makes a move after loading.
    // The sync save consumes isInitialSyncSave, then the user's move triggers
    // a second save that sets hasSavedInSession, so the toast SHOULD appear.

    mockCreate.mockResolvedValue('synced-game-id');

    // 1. Initial render: enabled=false, no moves
    const { rerender, unmount } = renderHook((props) => useAutoSave(props), {
      initialProps: {
        ...defaultProps,
        moves: [] as AlgebraicNotation[],
        enabled: false,
        gameId: 'existing-game-id',
      },
    });

    // 2. enabled transitions to true, moves still empty (sets isInitialSyncSave)
    rerender({
      ...defaultProps,
      moves: [] as AlgebraicNotation[],
      enabled: true,
      gameId: 'existing-game-id',
    });

    // 3. Moves loaded from storage (sync save consumes isInitialSyncSave)
    mockLoad.mockResolvedValue({
      moves: ['e4', 'e5'],
      playerColor: 'white',
      engineConfig: { kind: 'stockfish', skillLevel: 1 },
      status: 'in_progress',
    });

    rerender({
      ...defaultProps,
      moves: ['e4', 'e5'] as AlgebraicNotation[],
      enabled: true,
      gameId: 'existing-game-id',
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    // 4. User makes a new move (this save sets hasSavedInSession = true)
    rerender({
      ...defaultProps,
      moves: ['e4', 'e5', 'Nf3'] as AlgebraicNotation[],
      enabled: true,
      gameId: 'existing-game-id',
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });

    // 5. Unmount
    unmount();

    // Toast SHOULD be set because the user's move set hasSavedInSession
    expect(sessionStorage.getItem('blindfold_chess_show_save_toast')).toBe('true');
  });
});
