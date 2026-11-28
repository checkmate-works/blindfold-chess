import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getLeaderboardPlacements } from './leaderboard-placements';

vi.mock('server-only', () => ({}));

const allTime = vi.fn();
const monthly = vi.fn();
const weekly = vi.fn();
vi.mock('@/lib/db/challenge-queries', () => ({
  getUserAllTimeRank: (...args: unknown[]) => allTime(...args),
  getUserMonthlyRank: (...args: unknown[]) => monthly(...args),
  getUserWeeklyRank: (...args: unknown[]) => weekly(...args),
}));

describe('getLeaderboardPlacements', () => {
  beforeEach(() => {
    allTime.mockReset().mockResolvedValue({ rank: 12 });
    monthly.mockReset().mockResolvedValue({ rank: 5 });
    weekly.mockReset().mockResolvedValue({ rank: 2 });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it("lists the player's place in every period, all-time first", async () => {
    await expect(getLeaderboardPlacements('u1', 'legal_moves', 'knight')).resolves.toEqual([
      { period: 'all-time', rank: 12 },
      { period: 'monthly', rank: 5 },
      { period: 'weekly', rank: 2 },
    ]);
    expect(weekly).toHaveBeenCalledWith('u1', 'legal_moves', 'knight');
  });

  it('leaves out a period the player has no place in', async () => {
    weekly.mockResolvedValue(null);

    const placements = await getLeaderboardPlacements('u1', 'square_colors', 'default');

    expect(placements.map((p) => p.period)).toEqual(['all-time', 'monthly']);
  });

  it('keeps the other periods when one read fails', async () => {
    monthly.mockRejectedValue(new Error('db down'));

    const placements = await getLeaderboardPlacements('u1', 'square_colors', 'default');

    expect(placements).toEqual([
      { period: 'all-time', rank: 12 },
      { period: 'weekly', rank: 2 },
    ]);
  });

  it('asks nothing for a key the menu has no leaderboard for', async () => {
    await expect(getLeaderboardPlacements('u1', 'square_colors', 'knight')).resolves.toEqual([]);
    expect(allTime).not.toHaveBeenCalled();
  });
});
