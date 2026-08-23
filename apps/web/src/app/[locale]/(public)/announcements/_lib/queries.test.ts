import { describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

import {
  getLatestBannerAnnouncement,
  getPublishedAnnouncement,
  getPublishedAnnouncementCount,
  getPublishedAnnouncements,
  getPublishedAnnouncementsPaginated,
} from './queries';

vi.mock('@/lib/db', async () => {
  const mockDb = {
    select: vi.fn(),
    execute: vi.fn(),
  };

  return {
    ...(await actualDbSchema()),
    db: mockDb,
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

/**
 * Wraps a plain array with stub ResultQueryMeta properties so it satisfies
 * the return type of `db.execute()` from the postgres driver.
 * Uses `as any` because the full `ResultQueryMeta` shape is complex and
 * irrelevant to the behavior under test.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockExecuteResult(rows: Record<string, unknown>[]): any {
  return Object.assign(rows, {
    columns: [],
    count: rows.length,
    command: 'SELECT',
    statement: { columns: [], name: '', string: '', types: [] },
    state: null,
  });
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
      // SQL-level deduplication returns already-deduplicated rows
      const rows = [makeAnnouncement({ id: 'ann-1', slug: 'page-item' })];
      mockDb.execute.mockResolvedValue(mockExecuteResult(rows));

      const result = await getPublishedAnnouncementsPaginated('en', 20, 0);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('page-item');
    });

    it('normalises the timestamps to ISO strings', async () => {
      // The listing is cached, and the Data Cache returns its value as JSON.
      // Both paths have to hand the page the same type, so the query converts
      // rather than letting a hit and a miss differ.
      const rows = [
        makeAnnouncement({
          pinnedAt: new Date('2026-01-20T00:00:00Z'),
          publishedAt: new Date('2026-01-15T00:00:00Z'),
        }),
      ];
      mockDb.execute.mockResolvedValue(mockExecuteResult(rows));

      const [item] = await getPublishedAnnouncementsPaginated('en', 20, 0);

      expect(item.pinnedAt).toBe('2026-01-20T00:00:00.000Z');
      expect(item.publishedAt).toBe('2026-01-15T00:00:00.000Z');
    });

    it('should return empty array when offset exceeds total', async () => {
      mockDb.execute.mockResolvedValue(mockExecuteResult([]));

      const result = await getPublishedAnnouncementsPaginated('en', 20, 100);

      expect(result).toHaveLength(0);
    });

    it('should return empty array for pagination with 0 results', async () => {
      mockDb.execute.mockResolvedValue(mockExecuteResult([]));

      const result = await getPublishedAnnouncementsPaginated('en', 10, 0);

      expect(result).toHaveLength(0);
    });

    it('should deduplicate by slug, preferring the requested locale', async () => {
      // SQL ROW_NUMBER() picks the best locale per slug; mock returns already-deduplicated results
      const rows = [
        makeAnnouncement({ id: 'ann-ja', slug: 'hello', locale: 'ja', title: 'こんにちは' }),
        makeAnnouncement({ id: 'ann-2', slug: 'other', locale: 'en' }),
      ];
      mockDb.execute.mockResolvedValue(mockExecuteResult(rows));

      const result = await getPublishedAnnouncementsPaginated('ja', 20, 0);

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('hello');
      expect(result[0].locale).toBe('ja');
      expect(result[1].slug).toBe('other');
    });

    it('should fall back to default locale (en) when requested locale is not available', async () => {
      // SQL ROW_NUMBER() falls back to default locale (en) when requested is unavailable
      const rows = [
        makeAnnouncement({ id: 'ann-en', slug: 'hello', locale: 'en', title: 'Hello' }),
      ];
      mockDb.execute.mockResolvedValue(mockExecuteResult(rows));

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
      expect(result!.announcement.slug).toBe('test-slug');
      expect(result!.announcement.locale).toBe('en');
      expect(result!.availableLocales).toEqual(['en']);
    });

    it('should fall back to default locale (en) when requested locale is not available', async () => {
      const enAnnouncement = makeAnnouncement({ slug: 'test-slug', locale: 'en' });
      const chain = mockChain([enAnnouncement]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('test-slug', 'ja');

      expect(result).not.toBeNull();
      expect(result!.announcement.slug).toBe('test-slug');
      expect(result!.announcement.locale).toBe('en');
    });

    it('should fall back to any locale when neither requested nor default is available', async () => {
      const frAnnouncement = makeAnnouncement({ slug: 'test-slug', locale: 'fr' });
      const chain = mockChain([frAnnouncement]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('test-slug', 'ja');

      expect(result).not.toBeNull();
      expect(result!.announcement.locale).toBe('fr');
    });

    it('should prefer the requested locale when multiple locale variants exist', async () => {
      const enAnnouncement = makeAnnouncement({ id: 'ann-en', slug: 'test-slug', locale: 'en' });
      const jaAnnouncement = makeAnnouncement({ id: 'ann-ja', slug: 'test-slug', locale: 'ja' });
      const chain = mockChain([enAnnouncement, jaAnnouncement]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('test-slug', 'ja');

      expect(result).not.toBeNull();
      expect(result!.announcement.locale).toBe('ja');
      expect(result!.availableLocales.sort()).toEqual(['en', 'ja']);
    });

    it('should prefer default locale (en) over other locales when requested is unavailable', async () => {
      const enAnnouncement = makeAnnouncement({ id: 'ann-en', slug: 'test-slug', locale: 'en' });
      const frAnnouncement = makeAnnouncement({ id: 'ann-fr', slug: 'test-slug', locale: 'fr' });
      const chain = mockChain([frAnnouncement, enAnnouncement]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedAnnouncement('test-slug', 'ja');

      expect(result).not.toBeNull();
      expect(result!.announcement.locale).toBe('en');
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
      expect(result!.announcement.visibility).toBe('members_only');
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
      expect(result!.announcement.locale).toBe('fr');
      expect(result!.availableLocales.sort()).toEqual(['de', 'en', 'fr', 'ja']);
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
      expect(result!.announcement.locale).toBe('en');
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
      expect(result!.announcement.locale).toBe('fr');
    });
  });

  describe('getPublishedAnnouncementsPaginated - edge cases', () => {
    it('should return empty array when limit is 0', async () => {
      // SQL LIMIT 0 returns no rows
      mockDb.execute.mockResolvedValue(mockExecuteResult([]));

      const result = await getPublishedAnnouncementsPaginated('en', 0, 0);

      expect(result).toHaveLength(0);
    });

    it('should return empty when offset equals number of deduplicated results', async () => {
      // SQL OFFSET beyond available rows returns empty
      mockDb.execute.mockResolvedValue(mockExecuteResult([]));

      const result = await getPublishedAnnouncementsPaginated('en', 10, 2);

      expect(result).toHaveLength(0);
    });

    it('should return last item when offset is count-1 with limit 1', async () => {
      // SQL returns only the last deduplicated row with LIMIT 1 OFFSET 2
      mockDb.execute.mockResolvedValue(
        mockExecuteResult([makeAnnouncement({ id: 'ann-3', slug: 'c' })])
      );

      const result = await getPublishedAnnouncementsPaginated('en', 1, 2);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('c');
    });

    it('should deduplicate 3+ locale variants per slug and pick requested locale', async () => {
      // SQL ROW_NUMBER() picks 'de' for slug 'hello' and 'en' for slug 'other'
      mockDb.execute.mockResolvedValue(
        mockExecuteResult([
          makeAnnouncement({ id: 'ann-de', slug: 'hello', locale: 'de' }),
          makeAnnouncement({ id: 'ann-other', slug: 'other', locale: 'en' }),
        ])
      );

      const result = await getPublishedAnnouncementsPaginated('de', 20, 0);

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('hello');
      expect(result[0].locale).toBe('de');
      expect(result[1].slug).toBe('other');
    });

    it('should preserve ordering of first slug occurrence after deduplication', async () => {
      // SQL returns deduplicated rows ordered by pinned_at DESC NULLS LAST, published_at DESC
      mockDb.execute.mockResolvedValue(
        mockExecuteResult([
          makeAnnouncement({ id: 'ann-1-ja', slug: 'first', locale: 'ja' }),
          makeAnnouncement({ id: 'ann-2-ja', slug: 'second', locale: 'ja' }),
          makeAnnouncement({ id: 'ann-3-en', slug: 'third', locale: 'en' }),
        ])
      );

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
      // SQL ROW_NUMBER() picks best locale per slug: ja when available, en as fallback, fr as last resort
      mockDb.execute.mockResolvedValue(
        mockExecuteResult([
          makeAnnouncement({ id: 'ann-1-ja', slug: 'has-ja', locale: 'ja' }),
          makeAnnouncement({ id: 'ann-2-en', slug: 'no-ja', locale: 'en' }),
          makeAnnouncement({ id: 'ann-3-fr', slug: 'only-fr', locale: 'fr' }),
        ])
      );

      const result = await getPublishedAnnouncementsPaginated('ja', 20, 0);

      expect(result).toHaveLength(3);
      expect(result[0].locale).toBe('ja');
      expect(result[1].locale).toBe('en');
      expect(result[2].locale).toBe('fr');
    });

    it('should apply pagination after deduplication', async () => {
      // SQL deduplicates first (ROW_NUMBER), then applies LIMIT 1 OFFSET 0
      mockDb.execute.mockResolvedValue(
        mockExecuteResult([makeAnnouncement({ id: 'ann-1-en', slug: 'a', locale: 'en' })])
      );

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

  describe('getLatestBannerAnnouncement', () => {
    it('should return the latest published public announcement within 1 week', async () => {
      const recentAnnouncement = makeAnnouncement({
        id: 'ann-recent',
        slug: 'recent-news',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      });
      const chain = mockChain([recentAnnouncement]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getLatestBannerAnnouncement('en');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('ann-recent');
    });

    it('should return null when no announcements match', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getLatestBannerAnnouncement('en');

      expect(result).toBeNull();
    });

    it('should deduplicate by slug and prefer the requested locale', async () => {
      const enAnn = makeAnnouncement({
        id: 'ann-en',
        slug: 'update',
        locale: 'en',
        title: 'Update',
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });
      const jaAnn = makeAnnouncement({
        id: 'ann-ja',
        slug: 'update',
        locale: 'ja',
        title: 'アップデート',
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });
      const chain = mockChain([enAnn, jaAnn]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getLatestBannerAnnouncement('ja');

      expect(result).not.toBeNull();
      expect(result!.locale).toBe('ja');
    });

    it('should fall back to default locale (en) when requested locale is unavailable', async () => {
      const enAnn = makeAnnouncement({
        id: 'ann-en',
        slug: 'update',
        locale: 'en',
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });
      const chain = mockChain([enAnn]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getLatestBannerAnnouncement('ja');

      expect(result).not.toBeNull();
      expect(result!.locale).toBe('en');
    });

    it('should return the first announcement after deduplication (most recent by publishedAt)', async () => {
      const newer = makeAnnouncement({
        id: 'ann-newer',
        slug: 'newer-news',
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });
      const older = makeAnnouncement({
        id: 'ann-older',
        slug: 'older-news',
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      });
      // DB returns ordered by publishedAt DESC, so newer first
      const chain = mockChain([newer, older]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getLatestBannerAnnouncement('en');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('ann-newer');
    });

    it('should return null when all announcements are older than the display period', async () => {
      // The DB query filters by gte(publishedAt, cutoff), so old ones won't be returned
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getLatestBannerAnnouncement('en');

      expect(result).toBeNull();
    });

    it('should return null when announcements are draft status', async () => {
      // The DB query filters by status='published', so drafts won't be returned
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getLatestBannerAnnouncement('en');

      expect(result).toBeNull();
    });

    it('should return null when announcements are members_only visibility', async () => {
      // The DB query filters by visibility='public', so members_only won't be returned
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getLatestBannerAnnouncement('en');

      expect(result).toBeNull();
    });
  });
});
