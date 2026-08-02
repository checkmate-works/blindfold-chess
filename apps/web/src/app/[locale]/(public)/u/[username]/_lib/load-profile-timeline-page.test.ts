import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadProfileTimelinePage } from './load-profile-timeline-page';

const mockGetFeedData = vi.fn();

vi.mock('@/app/[locale]/(public)/(home)/_lib/queries', () => ({
  getFeedData: (...args: unknown[]) => mockGetFeedData(...args),
}));

const PROFILE_ID = '00000000-0000-4000-8000-000000000001';

/** A page whose feed rows all pointed at entities that no longer load. */
const holes = (nextCursor: string | null) => ({ items: [], nextCursor });

describe('loadProfileTimelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the first page as-is when it has items', async () => {
    const page = { items: [{ id: 'a' }], nextCursor: '2025-01-15T09:00:00.000Z' };
    mockGetFeedData.mockResolvedValue(page);

    await expect(
      loadProfileTimelinePage({
        profileId: PROFILE_ID,
        filter: 'all',
        currentUserId: undefined,
        limit: 10,
      })
    ).resolves.toEqual(page);
    expect(mockGetFeedData).toHaveBeenCalledTimes(1);
  });

  it('should scope the query to the actor, the filter and the viewer', async () => {
    mockGetFeedData.mockResolvedValue({ items: [{ id: 'a' }], nextCursor: null });

    await loadProfileTimelinePage({
      profileId: PROFILE_ID,
      filter: 'games',
      currentUserId: 'viewer-1',
      limit: 10,
      cursor: '2025-01-15T10:00:00.000Z',
    });

    expect(mockGetFeedData).toHaveBeenCalledWith({
      cursor: '2025-01-15T10:00:00.000Z',
      limit: 10,
      currentUserId: 'viewer-1',
      entityTypes: ['game'],
      actorId: PROFILE_ID,
    });
  });

  it('should page past a page of holes and return the first page that has items', async () => {
    // A member who deleted their ten most recent items: the first page counts
    // those rows against its limit and renders nothing, but the activity
    // behind them is still there and must not be reported as "no activity".
    const realPage = { items: [{ id: 'older' }], nextCursor: null };
    mockGetFeedData
      .mockResolvedValueOnce(holes('2025-01-15T09:00:00.000Z'))
      .mockResolvedValueOnce(realPage);

    await expect(
      loadProfileTimelinePage({
        profileId: PROFILE_ID,
        filter: 'all',
        currentUserId: undefined,
        limit: 10,
      })
    ).resolves.toEqual(realPage);

    expect(mockGetFeedData).toHaveBeenCalledTimes(2);
    expect(mockGetFeedData).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: '2025-01-15T09:00:00.000Z' })
    );
  });

  it('should stop at an exhausted cursor rather than looping', async () => {
    mockGetFeedData.mockResolvedValue(holes(null));

    await expect(
      loadProfileTimelinePage({
        profileId: PROFILE_ID,
        filter: 'all',
        currentUserId: undefined,
        limit: 10,
      })
    ).resolves.toEqual({ items: [], nextCursor: null });
    expect(mockGetFeedData).toHaveBeenCalledTimes(1);
  });

  it('should give up after the skip cap but keep the cursor alive', async () => {
    // The cap bounds one request; returning the live cursor is what lets the
    // caller keep paging instead of concluding the timeline is empty.
    mockGetFeedData.mockImplementation(() => Promise.resolve(holes('2025-01-15T09:00:00.000Z')));

    const result = await loadProfileTimelinePage({
      profileId: PROFILE_ID,
      filter: 'all',
      currentUserId: undefined,
      limit: 10,
    });

    expect(result).toEqual({ items: [], nextCursor: '2025-01-15T09:00:00.000Z' });
    expect(mockGetFeedData).toHaveBeenCalledTimes(6);
  });
});
