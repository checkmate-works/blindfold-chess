/**
 * The piece filter must follow the loaded sessions whenever the dashboard
 * adopts a menu it did not have before — including when the SERVER picked
 * the menu (first load, or a period change that reconciles to another menu).
 * A knight-only player used to land on "random" and an empty dashboard in
 * exactly those cases, because a menu-change effect reset the filter after
 * the fetch callback had derived it.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';

const mockGetDashboardData = vi.fn();

vi.mock('../_actions/get-challenge-sessions', () => ({
  getChallengeDashboardData: (...args: unknown[]) => mockGetDashboardData(...args),
}));

const { useDashboardData } = await import('./use-dashboard-data');

const knightRun = (id: string, daysAgo: number): ChallengeResultRow => ({
  id,
  menuType: 'legal_moves',
  leaderboardKey: 'knight',
  score: 10,
  incorrectAnswers: 0,
  timeTaken: 60,
  createdAt: new Date(Date.now() - daysAgo * 86_400_000),
});

const orientationRun = (id: string, leaderboardKey: string): ChallengeResultRow => ({
  id,
  menuType: 'coordinate_quiz',
  leaderboardKey,
  score: 12,
  incorrectAnswers: 0,
  timeTaken: 60,
  createdAt: new Date(),
});

beforeEach(() => {
  mockGetDashboardData.mockReset();
});

describe('useDashboardData – filter derivation when the menu is adopted', () => {
  it('derives the orientation filter when coordinate_quiz is auto-selected with black-only runs', async () => {
    mockGetDashboardData.mockResolvedValue({
      success: true,
      availableMenuTypes: ['coordinate_quiz'],
      selectedMenu: 'coordinate_quiz',
      sessions: [orientationRun('b1', 'black')],
      previousSessions: [],
    });

    const { result } = renderHook(() => useDashboardData('en'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.boardOrientationFilter).toBe('black');
    expect(result.current.tableRows).toHaveLength(1);
  });

  it('derives the piece filter when the server auto-selects legal_moves on first load', async () => {
    mockGetDashboardData.mockResolvedValue({
      success: true,
      availableMenuTypes: ['legal_moves'],
      selectedMenu: 'legal_moves',
      sessions: [knightRun('a', 0), knightRun('b', 1)],
      previousSessions: [],
    });

    const { result } = renderHook(() => useDashboardData('en'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selectedMenu).toBe('legal_moves');
    expect(result.current.activePiece).toBe('knight');
    expect(result.current.tableRows).toHaveLength(2);
    expect(result.current.currentStats.bestScore).toBe(10);
  });

  it('re-derives when a period change reconciles the selection to another menu', async () => {
    mockGetDashboardData.mockResolvedValueOnce({
      success: true,
      availableMenuTypes: ['coordinate_quiz'],
      selectedMenu: 'coordinate_quiz',
      sessions: [orientationRun('w', 'white')],
      previousSessions: [],
    });

    const { result } = renderHook(() => useDashboardData('en'));
    await waitFor(() => expect(result.current.selectedMenu).toBe('coordinate_quiz'));

    // The next period has no coordinate runs; the server falls back to legal_moves.
    mockGetDashboardData.mockResolvedValueOnce({
      success: true,
      availableMenuTypes: ['legal_moves'],
      selectedMenu: 'legal_moves',
      sessions: [knightRun('k', 8)],
      previousSessions: [],
    });
    act(() => result.current.setSelectedPeriod('lastWeek'));

    await waitFor(() => expect(result.current.selectedMenu).toBe('legal_moves'));
    await waitFor(() => expect(result.current.activePiece).toBe('knight'));
    expect(result.current.tableRows).toHaveLength(1);
  });

  it('keeps a player-chosen piece across a period change that keeps the menu', async () => {
    const response = {
      success: true,
      availableMenuTypes: ['legal_moves'],
      selectedMenu: 'legal_moves',
      sessions: [knightRun('a', 0)],
      previousSessions: [],
    };
    mockGetDashboardData.mockResolvedValue(response);

    const { result } = renderHook(() => useDashboardData('en'));
    await waitFor(() => expect(result.current.activePiece).toBe('knight'));

    act(() => result.current.handlePieceSelect('b'));
    expect(result.current.activePiece).toBe('bishop');

    act(() => result.current.setSelectedPeriod('thisMonth'));
    await waitFor(() => expect(mockGetDashboardData).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activePiece).toBe('bishop');
  });
});
