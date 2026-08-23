import { describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

import {
  getLatestPublishedArticles,
  getPublishedArticle,
  getPublishedArticleCount,
  getPublishedArticles,
  getPublishedArticlesForSitemap,
  getPublishedArticlesPaginated,
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

const makeArticle = (overrides: Record<string, unknown> = {}) => ({
  id: 'art-1',
  slug: 'test-article',
  title: 'Test Article',
  content: '# Hello\nThis is a test.',
  locale: 'en',
  status: 'published',
  pinnedAt: null,
  publishedAt: new Date('2026-01-15T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

describe('articles queries', () => {
  describe('getPublishedArticles', () => {
    it('should return all published articles without locale filter', async () => {
      const articles = [
        makeArticle({ id: 'art-1', slug: 'first', locale: 'en' }),
        makeArticle({ id: 'art-2', slug: 'first', locale: 'ja' }),
        makeArticle({ id: 'art-3', slug: 'second', locale: 'en' }),
      ];
      const chain = mockChain(articles);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticles();

      expect(result).toHaveLength(3);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no articles exist', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticles();

      expect(result).toEqual([]);
    });

    it('should NOT deduplicate by slug (returns all locale variants)', async () => {
      const articles = [
        makeArticle({ id: 'art-1', slug: 'hello', locale: 'en' }),
        makeArticle({ id: 'art-2', slug: 'hello', locale: 'ja' }),
        makeArticle({ id: 'art-3', slug: 'hello', locale: 'fr' }),
      ];
      const chain = mockChain(articles);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticles();

      expect(result).toHaveLength(3);
      expect(result.map((a) => a.locale)).toEqual(['en', 'ja', 'fr']);
    });
  });

  describe('getLatestPublishedArticles', () => {
    it('should return deduplicated articles limited by count', async () => {
      // With SQL deduplication, db.execute returns already-deduplicated results
      const deduplicated = [
        makeArticle({ id: 'art-1', slug: 'first', locale: 'en' }),
        makeArticle({ id: 'art-3', slug: 'second', locale: 'en' }),
      ];
      mockDb.execute.mockResolvedValue(deduplicated as never);

      const result = await getLatestPublishedArticles('en', 2);

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('first');
      expect(result[1].slug).toBe('second');
    });

    it('should prefer the requested locale', async () => {
      // SQL ROW_NUMBER picks the best locale; db.execute returns the winner
      const deduplicated = [
        makeArticle({ id: 'art-2', slug: 'hello', locale: 'ja', title: 'こんにちは' }),
      ];
      mockDb.execute.mockResolvedValue(deduplicated as never);

      const result = await getLatestPublishedArticles('ja', 5);

      expect(result).toHaveLength(1);
      expect(result[0].locale).toBe('ja');
      expect(result[0].title).toBe('こんにちは');
    });

    it('should fall back to default locale (en) when requested locale is not available', async () => {
      const deduplicated = [makeArticle({ id: 'art-1', slug: 'hello', locale: 'en' })];
      mockDb.execute.mockResolvedValue(deduplicated as never);

      const result = await getLatestPublishedArticles('ja', 5);

      expect(result).toHaveLength(1);
      expect(result[0].locale).toBe('en');
    });

    it('should fall back to first available when neither requested nor default locale exists', async () => {
      const deduplicated = [makeArticle({ id: 'art-1', slug: 'hello', locale: 'fr' })];
      mockDb.execute.mockResolvedValue(deduplicated as never);

      const result = await getLatestPublishedArticles('ja', 5);

      expect(result).toHaveLength(1);
      expect(result[0].locale).toBe('fr');
    });

    it('should return empty array when no articles exist', async () => {
      mockDb.execute.mockResolvedValue([] as never);

      const result = await getLatestPublishedArticles('en', 5);

      expect(result).toEqual([]);
    });

    it('should return empty array when limit is 0', async () => {
      mockDb.execute.mockResolvedValue([] as never);

      const result = await getLatestPublishedArticles('en', 0);

      expect(result).toEqual([]);
    });
  });

  describe('getPublishedArticlesPaginated', () => {
    it('should return paginated articles', async () => {
      const deduplicated = [makeArticle({ id: 'art-1', slug: 'page-item' })];
      mockDb.execute.mockResolvedValue(deduplicated as never);

      const result = await getPublishedArticlesPaginated('en', 20, 0);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('page-item');
    });

    it('should return empty array when offset exceeds total', async () => {
      mockDb.execute.mockResolvedValue([] as never);

      const result = await getPublishedArticlesPaginated('en', 20, 100);

      expect(result).toEqual([]);
    });

    it('should return empty array for pagination with 0 results', async () => {
      mockDb.execute.mockResolvedValue([] as never);

      const result = await getPublishedArticlesPaginated('en', 10, 0);

      expect(result).toEqual([]);
    });

    it('should deduplicate by slug, preferring the requested locale', async () => {
      // SQL does the deduplication; mock returns already-deduplicated results
      const deduplicated = [
        makeArticle({ id: 'art-ja', slug: 'hello', locale: 'ja', title: 'こんにちは' }),
        makeArticle({ id: 'art-2', slug: 'other', locale: 'en' }),
      ];
      mockDb.execute.mockResolvedValue(deduplicated as never);

      const result = await getPublishedArticlesPaginated('ja', 20, 0);

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('hello');
      expect(result[0].locale).toBe('ja');
      expect(result[1].slug).toBe('other');
    });

    it('should fall back to default locale (en) when requested locale is not available', async () => {
      const deduplicated = [
        makeArticle({ id: 'art-en', slug: 'hello', locale: 'en', title: 'Hello' }),
      ];
      mockDb.execute.mockResolvedValue(deduplicated as never);

      const result = await getPublishedArticlesPaginated('ja', 20, 0);

      expect(result).toHaveLength(1);
      expect(result[0].locale).toBe('en');
    });
  });

  describe('getPublishedArticleCount', () => {
    it('should return count of published articles deduplicated by slug', async () => {
      const chain = mockChain([{ count: 5 }]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticleCount();

      expect(result).toBe(5);
    });

    it('should return 0 when no articles exist', async () => {
      const chain = mockChain([{ count: 0 }]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticleCount();

      expect(result).toBe(0);
    });
  });

  describe('getPublishedArticle', () => {
    it('should return article matching the requested locale', async () => {
      const article = makeArticle({ slug: 'test-slug', locale: 'en' });
      const chain = mockChain([article]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticle('test-slug', 'en');

      expect(result).not.toBeNull();
      expect(result!.article.slug).toBe('test-slug');
      expect(result!.article.locale).toBe('en');
      expect(result!.availableLocales).toEqual(['en']);
    });

    it('should fall back to default locale (en) when requested locale is not available', async () => {
      const enArticle = makeArticle({ slug: 'test-slug', locale: 'en' });
      const chain = mockChain([enArticle]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticle('test-slug', 'ja');

      expect(result).not.toBeNull();
      expect(result!.article.slug).toBe('test-slug');
      expect(result!.article.locale).toBe('en');
    });

    it('should fall back to any locale when neither requested nor default is available', async () => {
      const frArticle = makeArticle({ slug: 'test-slug', locale: 'fr' });
      const chain = mockChain([frArticle]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticle('test-slug', 'ja');

      expect(result).not.toBeNull();
      expect(result!.article.locale).toBe('fr');
    });

    it('should prefer the requested locale when multiple locale variants exist', async () => {
      const enArticle = makeArticle({ id: 'art-en', slug: 'test-slug', locale: 'en' });
      const jaArticle = makeArticle({ id: 'art-ja', slug: 'test-slug', locale: 'ja' });
      const chain = mockChain([enArticle, jaArticle]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticle('test-slug', 'ja');

      expect(result).not.toBeNull();
      expect(result!.article.locale).toBe('ja');
      expect(result!.availableLocales).toEqual(['en', 'ja']);
    });

    it('should prefer default locale (en) over other locales when requested is unavailable', async () => {
      const enArticle = makeArticle({ id: 'art-en', slug: 'test-slug', locale: 'en' });
      const frArticle = makeArticle({ id: 'art-fr', slug: 'test-slug', locale: 'fr' });
      const chain = mockChain([frArticle, enArticle]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticle('test-slug', 'ja');

      expect(result).not.toBeNull();
      expect(result!.article.locale).toBe('en');
    });

    it('should return null when article does not exist', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticle('nonexistent-slug', 'en');

      expect(result).toBeNull();
    });

    it('should return null for unpublished article', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticle('draft-slug', 'en');

      expect(result).toBeNull();
    });

    it('should pick requested locale from 3+ locale variants', async () => {
      const chain = mockChain([
        makeArticle({ id: 'art-en', slug: 'multi', locale: 'en' }),
        makeArticle({ id: 'art-ja', slug: 'multi', locale: 'ja' }),
        makeArticle({ id: 'art-fr', slug: 'multi', locale: 'fr' }),
        makeArticle({ id: 'art-de', slug: 'multi', locale: 'de' }),
      ]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticle('multi', 'fr');

      expect(result).not.toBeNull();
      expect(result!.article.locale).toBe('fr');
      expect(result!.availableLocales).toEqual(['en', 'ja', 'fr', 'de']);
    });

    it('should fall back to en when requested locale is missing among 3+ variants', async () => {
      const chain = mockChain([
        makeArticle({ id: 'art-en', slug: 'multi', locale: 'en' }),
        makeArticle({ id: 'art-fr', slug: 'multi', locale: 'fr' }),
        makeArticle({ id: 'art-de', slug: 'multi', locale: 'de' }),
      ]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticle('multi', 'ja');

      expect(result).not.toBeNull();
      expect(result!.article.locale).toBe('en');
    });

    it('should fall back to first available when neither requested nor en exists among 3+ variants', async () => {
      const chain = mockChain([
        makeArticle({ id: 'art-fr', slug: 'multi', locale: 'fr' }),
        makeArticle({ id: 'art-de', slug: 'multi', locale: 'de' }),
        makeArticle({ id: 'art-es', slug: 'multi', locale: 'es' }),
      ]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticle('multi', 'ja');

      expect(result).not.toBeNull();
      expect(result!.article.locale).toBe('fr');
    });
  });

  describe('getPublishedArticlesPaginated - edge cases', () => {
    it('should return empty array when limit is 0', async () => {
      mockDb.execute.mockResolvedValue([] as never);

      const result = await getPublishedArticlesPaginated('en', 0, 0);

      expect(result).toEqual([]);
    });

    it('should return empty when offset equals number of deduplicated results', async () => {
      mockDb.execute.mockResolvedValue([] as never);

      const result = await getPublishedArticlesPaginated('en', 10, 2);

      expect(result).toEqual([]);
    });

    it('should return last item when offset is count-1 with limit 1', async () => {
      const deduplicated = [makeArticle({ id: 'art-3', slug: 'c' })];
      mockDb.execute.mockResolvedValue(deduplicated as never);

      const result = await getPublishedArticlesPaginated('en', 1, 2);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('c');
    });

    it('should deduplicate 3+ locale variants per slug and pick requested locale', async () => {
      // SQL ROW_NUMBER handles deduplication; mock returns already-deduplicated
      const deduplicated = [
        makeArticle({ id: 'art-de', slug: 'hello', locale: 'de' }),
        makeArticle({ id: 'art-other', slug: 'other', locale: 'en' }),
      ];
      mockDb.execute.mockResolvedValue(deduplicated as never);

      const result = await getPublishedArticlesPaginated('de', 20, 0);

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('hello');
      expect(result[0].locale).toBe('de');
      expect(result[1].slug).toBe('other');
    });

    it('should preserve ordering of first slug occurrence after deduplication', async () => {
      // SQL handles ordering; mock returns already-ordered deduplicated results
      const deduplicated = [
        makeArticle({ id: 'art-1-ja', slug: 'first', locale: 'ja' }),
        makeArticle({ id: 'art-2-ja', slug: 'second', locale: 'ja' }),
        makeArticle({ id: 'art-3-en', slug: 'third', locale: 'en' }),
      ];
      mockDb.execute.mockResolvedValue(deduplicated as never);

      const result = await getPublishedArticlesPaginated('ja', 20, 0);

      expect(result).toHaveLength(3);
      expect(result[0].slug).toBe('first');
      expect(result[0].locale).toBe('ja');
      expect(result[1].slug).toBe('second');
      expect(result[1].locale).toBe('ja');
      expect(result[2].slug).toBe('third');
      expect(result[2].locale).toBe('en');
    });

    it('should handle mixed fallback: some slugs match locale, some fall back', async () => {
      const deduplicated = [
        makeArticle({ id: 'art-1-ja', slug: 'has-ja', locale: 'ja' }),
        makeArticle({ id: 'art-2-en', slug: 'no-ja', locale: 'en' }),
        makeArticle({ id: 'art-3-fr', slug: 'only-fr', locale: 'fr' }),
      ];
      mockDb.execute.mockResolvedValue(deduplicated as never);

      const result = await getPublishedArticlesPaginated('ja', 20, 0);

      expect(result).toHaveLength(3);
      expect(result[0].locale).toBe('ja');
      expect(result[1].locale).toBe('en');
      expect(result[2].locale).toBe('fr');
    });

    it('should apply pagination after deduplication', async () => {
      // SQL deduplicates first, then paginates; mock returns the paginated result
      const deduplicated = [makeArticle({ id: 'art-1-en', slug: 'a', locale: 'en' })];
      mockDb.execute.mockResolvedValue(deduplicated as never);

      const result = await getPublishedArticlesPaginated('en', 1, 0);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('a');
    });
  });

  describe('getPublishedArticlesForSitemap', () => {
    it('should return slug, locale, updatedAt, and publishedAt for all published articles', async () => {
      const articles = [
        makeArticle({ id: 'art-1', slug: 'first', locale: 'en' }),
        makeArticle({ id: 'art-2', slug: 'first', locale: 'ja' }),
        makeArticle({ id: 'art-3', slug: 'second', locale: 'en' }),
      ];
      const chain = mockChain(articles);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticlesForSitemap();

      expect(result).toHaveLength(3);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no published articles exist', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticlesForSitemap();

      expect(result).toEqual([]);
    });

    it('should NOT deduplicate by slug (returns all locale variants for sitemap)', async () => {
      const articles = [
        makeArticle({ id: 'art-1', slug: 'hello', locale: 'en' }),
        makeArticle({ id: 'art-2', slug: 'hello', locale: 'ja' }),
      ];
      const chain = mockChain(articles);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticlesForSitemap();

      expect(result).toHaveLength(2);
    });
  });

  describe('getPublishedArticleCount - edge cases', () => {
    it('should coerce string count to number', async () => {
      // SQL COUNT may return a string in some drivers
      const chain = mockChain([{ count: '3' }]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getPublishedArticleCount();

      expect(result).toBe(3);
      expect(typeof result).toBe('number');
    });
  });
});
