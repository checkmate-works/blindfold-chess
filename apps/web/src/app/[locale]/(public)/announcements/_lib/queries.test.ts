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

      const result = await getPublishedAnnouncements();

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('first');
      expect(result[1].slug).toBe('second');
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no announcements exist', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncements();

      expect(result).toEqual([]);
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

      const result = await getPublishedAnnouncements();

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

    it('should deduplicate by slug, preferring the requested locale', async () => {
      const announcements = [
        makeAnnouncement({ id: 'ann-en', slug: 'hello', locale: 'en', title: 'Hello' }),
        makeAnnouncement({ id: 'ann-ja', slug: 'hello', locale: 'ja', title: 'こんにちは' }),
        makeAnnouncement({ id: 'ann-2', slug: 'other', locale: 'en' }),
      ];
      const chain = mockChain(announcements);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('ja', 20, 0);

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('hello');
      expect(result[0].locale).toBe('ja');
      expect(result[1].slug).toBe('other');
    });

    it('should fall back to default locale (en) when requested locale is not available', async () => {
      const announcements = [
        makeAnnouncement({ id: 'ann-en', slug: 'hello', locale: 'en', title: 'Hello' }),
      ];
      const chain = mockChain(announcements);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('ja', 20, 0);

      expect(result).toHaveLength(1);
      expect(result[0].locale).toBe('en');
    });
  });

  describe('getPublishedAnnouncementCount', () => {
    it('should return count of published announcements deduplicated by slug', async () => {
      const chain = mockChain([{ count: 5 }]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementCount();

      expect(result).toBe(5);
    });

    it('should return 0 when no announcements exist', async () => {
      const chain = mockChain([{ count: 0 }]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementCount();

      expect(result).toBe(0);
    });
  });

  describe('getPublishedAnnouncement', () => {
    it('should return announcement matching the requested locale', async () => {
      const announcement = makeAnnouncement({ slug: 'test-slug', locale: 'en' });
      const chain = mockChain([announcement]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('test-slug', 'en');

      expect(result).not.toBeNull();
      expect(result!.slug).toBe('test-slug');
      expect(result!.locale).toBe('en');
    });

    it('should fall back to default locale (en) when requested locale is not available', async () => {
      const enAnnouncement = makeAnnouncement({ slug: 'test-slug', locale: 'en' });
      const chain = mockChain([enAnnouncement]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('test-slug', 'ja');

      expect(result).not.toBeNull();
      expect(result!.slug).toBe('test-slug');
      expect(result!.locale).toBe('en');
    });

    it('should fall back to any locale when neither requested nor default is available', async () => {
      const frAnnouncement = makeAnnouncement({ slug: 'test-slug', locale: 'fr' });
      const chain = mockChain([frAnnouncement]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('test-slug', 'ja');

      expect(result).not.toBeNull();
      expect(result!.locale).toBe('fr');
    });

    it('should prefer the requested locale when multiple locale variants exist', async () => {
      const enAnnouncement = makeAnnouncement({ id: 'ann-en', slug: 'test-slug', locale: 'en' });
      const jaAnnouncement = makeAnnouncement({ id: 'ann-ja', slug: 'test-slug', locale: 'ja' });
      const chain = mockChain([enAnnouncement, jaAnnouncement]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('test-slug', 'ja');

      expect(result).not.toBeNull();
      expect(result!.locale).toBe('ja');
    });

    it('should prefer default locale (en) over other locales when requested is unavailable', async () => {
      const enAnnouncement = makeAnnouncement({ id: 'ann-en', slug: 'test-slug', locale: 'en' });
      const frAnnouncement = makeAnnouncement({ id: 'ann-fr', slug: 'test-slug', locale: 'fr' });
      const chain = mockChain([frAnnouncement, enAnnouncement]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('test-slug', 'ja');

      expect(result).not.toBeNull();
      expect(result!.locale).toBe('en');
    });

    it('should return null when announcement does not exist', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('nonexistent-slug', 'en');

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

    it('should pick requested locale from 3+ locale variants', async () => {
      const chain = mockChain([
        makeAnnouncement({ id: 'ann-en', slug: 'multi', locale: 'en' }),
        makeAnnouncement({ id: 'ann-ja', slug: 'multi', locale: 'ja' }),
        makeAnnouncement({ id: 'ann-fr', slug: 'multi', locale: 'fr' }),
        makeAnnouncement({ id: 'ann-de', slug: 'multi', locale: 'de' }),
      ]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('multi', 'fr');

      expect(result).not.toBeNull();
      expect(result!.locale).toBe('fr');
    });

    it('should fall back to en when requested locale is missing among 3+ variants', async () => {
      const chain = mockChain([
        makeAnnouncement({ id: 'ann-en', slug: 'multi', locale: 'en' }),
        makeAnnouncement({ id: 'ann-fr', slug: 'multi', locale: 'fr' }),
        makeAnnouncement({ id: 'ann-de', slug: 'multi', locale: 'de' }),
      ]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('multi', 'ja');

      expect(result).not.toBeNull();
      expect(result!.locale).toBe('en');
    });

    it('should fall back to first available when neither requested nor en exists among 3+ variants', async () => {
      const chain = mockChain([
        makeAnnouncement({ id: 'ann-fr', slug: 'multi', locale: 'fr' }),
        makeAnnouncement({ id: 'ann-de', slug: 'multi', locale: 'de' }),
        makeAnnouncement({ id: 'ann-es', slug: 'multi', locale: 'es' }),
      ]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('multi', 'ja');

      expect(result).not.toBeNull();
      expect(result!.locale).toBe('fr');
    });
  });

  describe('getPublishedAnnouncementsPaginated - edge cases', () => {
    it('should return empty array when limit is 0', async () => {
      const chain = mockChain([makeAnnouncement({ id: 'ann-1', slug: 'hello' })]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('en', 0, 0);

      expect(result).toEqual([]);
    });

    it('should return empty when offset equals number of deduplicated results', async () => {
      const chain = mockChain([
        makeAnnouncement({ id: 'ann-1', slug: 'a' }),
        makeAnnouncement({ id: 'ann-2', slug: 'b' }),
      ]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('en', 10, 2);

      expect(result).toEqual([]);
    });

    it('should return last item when offset is count-1 with limit 1', async () => {
      const chain = mockChain([
        makeAnnouncement({ id: 'ann-1', slug: 'a' }),
        makeAnnouncement({ id: 'ann-2', slug: 'b' }),
        makeAnnouncement({ id: 'ann-3', slug: 'c' }),
      ]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('en', 1, 2);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('c');
    });

    it('should deduplicate 3+ locale variants per slug and pick requested locale', async () => {
      const chain = mockChain([
        makeAnnouncement({ id: 'ann-en', slug: 'hello', locale: 'en' }),
        makeAnnouncement({ id: 'ann-ja', slug: 'hello', locale: 'ja' }),
        makeAnnouncement({ id: 'ann-fr', slug: 'hello', locale: 'fr' }),
        makeAnnouncement({ id: 'ann-de', slug: 'hello', locale: 'de' }),
        makeAnnouncement({ id: 'ann-other', slug: 'other', locale: 'en' }),
      ]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('de', 20, 0);

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('hello');
      expect(result[0].locale).toBe('de');
      expect(result[1].slug).toBe('other');
    });

    it('should preserve ordering of first slug occurrence after deduplication', async () => {
      const chain = mockChain([
        makeAnnouncement({ id: 'ann-1-en', slug: 'first', locale: 'en' }),
        makeAnnouncement({ id: 'ann-2-en', slug: 'second', locale: 'en' }),
        makeAnnouncement({ id: 'ann-1-ja', slug: 'first', locale: 'ja' }),
        makeAnnouncement({ id: 'ann-3-en', slug: 'third', locale: 'en' }),
        makeAnnouncement({ id: 'ann-2-ja', slug: 'second', locale: 'ja' }),
      ]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('ja', 20, 0);

      expect(result).toHaveLength(3);
      expect(result[0].slug).toBe('first');
      expect(result[0].locale).toBe('ja');
      expect(result[1].slug).toBe('second');
      expect(result[1].locale).toBe('ja');
      expect(result[2].slug).toBe('third');
      expect(result[2].locale).toBe('en');
    });

    it('should handle mixed fallback: some slugs match locale, some fall back', async () => {
      const chain = mockChain([
        makeAnnouncement({ id: 'ann-1-ja', slug: 'has-ja', locale: 'ja' }),
        makeAnnouncement({ id: 'ann-2-en', slug: 'no-ja', locale: 'en' }),
        makeAnnouncement({ id: 'ann-3-fr', slug: 'only-fr', locale: 'fr' }),
      ]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('ja', 20, 0);

      expect(result).toHaveLength(3);
      expect(result[0].locale).toBe('ja');
      expect(result[1].locale).toBe('en');
      expect(result[2].locale).toBe('fr');
    });

    it('should apply pagination after deduplication', async () => {
      // 4 rows but only 2 unique slugs after deduplication
      const chain = mockChain([
        makeAnnouncement({ id: 'ann-1-en', slug: 'a', locale: 'en' }),
        makeAnnouncement({ id: 'ann-1-ja', slug: 'a', locale: 'ja' }),
        makeAnnouncement({ id: 'ann-2-en', slug: 'b', locale: 'en' }),
        makeAnnouncement({ id: 'ann-2-ja', slug: 'b', locale: 'ja' }),
      ]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementsPaginated('en', 1, 0);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('a');
    });
  });

  describe('getPublishedAnnouncementCount - edge cases', () => {
    it('should coerce string count to number', async () => {
      // SQL COUNT may return a string in some drivers
      const chain = mockChain([{ count: '3' }]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncementCount();

      expect(result).toBe(3);
      expect(typeof result).toBe('number');
    });
  });
});
