import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetOptionalUser = vi.fn();
const mockUserHasProfile = vi.fn();
const mockGetAllRanks = vi.fn();
const mockGetUserAchievedRankIds = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getOptionalUser: (...args: unknown[]) => mockGetOptionalUser(...args),
  userHasProfile: (...args: unknown[]) => mockUserHasProfile(...args),
}));

vi.mock('../_lib/queries', () => ({
  getAllRanks: (...args: unknown[]) => mockGetAllRanks(...args),
  getUserAchievedRankIds: (...args: unknown[]) => mockGetUserAchievedRankIds(...args),
  getAchievedSlugsForUser: async (userId: string) => {
    const [dbRanks, achievedRankIds] = await Promise.all([
      mockGetAllRanks(),
      mockGetUserAchievedRankIds(userId),
    ]);
    return new Set(
      dbRanks
        .filter((r: { id: string; slug: string }) => achievedRankIds.has(r.id))
        .map((r: { id: string; slug: string }) => r.slug)
    );
  },
}));

const { getPublishPromotionTarget } = await import('./getPublishPromotionTarget');

const RANK_ROWS = [
  { id: 'id-1kyu', slug: '1kyu' },
  { id: 'id-1dan', slug: '1dan' },
];

function achieve(...slugs: string[]) {
  mockGetUserAchievedRankIds.mockResolvedValue(
    new Set(RANK_ROWS.filter((r) => slugs.includes(r.slug)).map((r) => r.id))
  );
}

describe('getPublishPromotionTarget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });
    mockUserHasProfile.mockResolvedValue(true);
    mockGetAllRanks.mockResolvedValue(RANK_ROWS);
    achieve();
  });

  it('returns null for an anonymous caller', async () => {
    mockGetOptionalUser.mockResolvedValue(null);
    await expect(getPublishPromotionTarget('1dan')).resolves.toBeNull();
  });

  it('returns null for a provisional caller (no profile)', async () => {
    mockUserHasProfile.mockResolvedValue(false);
    await expect(getPublishPromotionTarget('1dan')).resolves.toBeNull();
  });

  it('rejects an unexpected qualification value without touching auth', async () => {
    await expect(
      getPublishPromotionTarget('5kyu' as Parameters<typeof getPublishPromotionTarget>[0])
    ).resolves.toBeNull();
    expect(mockGetOptionalUser).not.toHaveBeenCalled();
  });

  it('promises 1dan for a dan-grade game even with NO ranks at all (skip-grant)', async () => {
    await expect(getPublishPromotionTarget('1dan')).resolves.toBe('1dan');
  });

  it('falls back to 1kyu when 1dan is already held (a dan-grade game covers the 1kyu bar)', async () => {
    achieve('1dan');
    await expect(getPublishPromotionTarget('1dan')).resolves.toBe('1kyu');
  });

  it('returns null when both game ranks are already held', async () => {
    achieve('1dan', '1kyu');
    await expect(getPublishPromotionTarget('1dan')).resolves.toBeNull();
  });

  it('promises 1kyu for a kyu-grade game with no ranks at all (skip-grant)', async () => {
    await expect(getPublishPromotionTarget('1kyu')).resolves.toBe('1kyu');
  });

  it('returns null for a kyu-grade game when 1kyu is already held', async () => {
    achieve('1kyu');
    await expect(getPublishPromotionTarget('1kyu')).resolves.toBeNull();
  });
});
