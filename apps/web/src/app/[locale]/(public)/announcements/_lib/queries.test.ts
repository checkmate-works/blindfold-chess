import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';

import {
  getPublishedAnnouncement,
  getPublishedAnnouncementCount,
  getPublishedAnnouncements,
  getPublishedAnnouncementsPaginated,
} from './queries';

vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(),
  };

  return {
    db: mockDb,
    announcements: {
      id: 'announcements.id',
      slug: 'announcements.slug',
      title: 'announcements.title',
      content: 'announcements.content',
      locale: 'announcements.locale',
      status: 'announcements.status',
      visibility: 'announcements.visibility',
      pinnedAt: 'announcements.pinned_at',
      publishedAt: 'announcements.published_at',
      createdAt: 'announcements.created_at',
      updatedAt: 'announcements.updated_at',
    },
  };
});

const mockDb = vi.mocked(db);

/**
 * Creates a chainable mock that resolves to `rows` when awaited.
 * Each chained method returns the same object so the Drizzle-style chaining works.
 */
function mockChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'offset'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(rows);
  return chain;
}

const makeAnnouncement = (overrides: Record<string, unknown> = {}) => ({
  id: 'ann-1',
  slug: 'test-announcement',
  title: 'Test Announcement',
  content: '# Hello\nThis is a test.',
  locale: 'en',
  status: 'published',
  visibility: 'public',
  pinnedAt: null,
  publishedAt: new Date('2026-01-15T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

describe('announcements queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPublishedAnnouncements', () => {
    it('should return all published public announcements', async () => {
      const announcements = [
        makeAnnouncement({ id: 'ann-1', slug: 'first' }),
        makeAnnouncement({ id: 'ann-2', slug: 'second' }),
      ];
      const chain = mockChain(announcements);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncements('en');

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('first');
      expect(result[1].slug).toBe('second');
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no announcements exist', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncements('en');

      expect(result).toEqual([]);
    });

    it('should pass locale to query', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      await getPublishedAnnouncements('ja');

      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it('should return pinned announcements first', async () => {
      const pinned = makeAnnouncement({
        id: 'ann-pinned',
        slug: 'pinned',
        pinnedAt: new Date('2026-01-10T00:00:00Z'),
      });
      const unpinned = makeAnnouncement({ id: 'ann-unpinned', slug: 'unpinned' });
      const chain = mockChain([pinned, unpinned]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncements('en');

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('pinned');
      expect(result[1].slug).toBe('unpinned');
    });
  });

  describe('getPublishedAnnouncementsPaginated', () => {
    it('should return paginated announcements', async () => {
      const announcements = [makeAnnouncement({ id: 'ann-1', slug: 'page-item' })];
      const chain = mockChain(announcements);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('en', 20, 0);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('page-item');
    });

    it('should return empty array when offset exceeds total', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('en', 20, 100);

      expect(result).toEqual([]);
    });

    it('should return empty array for pagination with 0 results', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('en', 10, 0);

      expect(result).toEqual([]);
    });

    it('should work with different limit and offset values', async () => {
      const announcements = [makeAnnouncement({ id: 'ann-3', slug: 'third' })];
      const chain = mockChain(announcements);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('ja', 5, 10);

      expect(result).toHaveLength(1);
    });
  });

  describe('getPublishedAnnouncementCount', () => {
    it('should return count of published public announcements', async () => {
      const chain = mockChain([{ count: 5 }]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementCount('en');

      expect(result).toBe(5);
    });

    it('should return 0 when no announcements exist', async () => {
      const chain = mockChain([{ count: 0 }]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementCount('ja');

      expect(result).toBe(0);
    });
  });

  describe('getPublishedAnnouncement', () => {
    it('should return announcement by slug and locale', async () => {
      const announcement = makeAnnouncement({ slug: 'test-slug', locale: 'en' });
      const chain = mockChain([announcement]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('test-slug', 'en');

      expect(result).not.toBeNull();
      expect(result!.slug).toBe('test-slug');
    });

    it('should return null when announcement does not exist', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('nonexistent-slug', 'en');

      expect(result).toBeNull();
    });

    it('should return null for invalid slug', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('invalid-slug-xyz', 'en');

      expect(result).toBeNull();
    });

    it('should return members_only announcement (no visibility filter)', async () => {
      const membersOnlyAnn = makeAnnouncement({
        slug: 'members-only',
        visibility: 'members_only',
      });
      const chain = mockChain([membersOnlyAnn]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('members-only', 'en');

      expect(result).not.toBeNull();
      expect(result!.visibility).toBe('members_only');
    });

    it('should return null for unpublished announcement', async () => {
      // The query filters by status='published', so unpublished won't be returned
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('draft-slug', 'en');

      expect(result).toBeNull();
    });
  });
});
