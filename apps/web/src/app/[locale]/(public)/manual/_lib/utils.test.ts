import { SUPPORTED_LOCALES } from '@/config';
import { describe, expect, it } from 'vitest';

import { MANUAL_ARTICLE_SLUGS } from './types';
import { getAllManualArticles, getManualArticle, getManualArticleAvailableLocales } from './utils';

const ALL_SLUGS = Object.values(MANUAL_ARTICLE_SLUGS);

/**
 * Regression guard: every supported locale must render the manual index and
 * every individual article with non-empty content. Previously `pt-BR` had no
 * loaders registered, so `/pt-BR/manual` rendered an empty cards grid (the
 * page frame was visible but the body was blank). Adding a new locale to
 * `SUPPORTED_LOCALES` without registering loaders here will fail this test.
 */
describe('manual content registry parity', () => {
  for (const locale of SUPPORTED_LOCALES) {
    describe(`locale ${locale}`, () => {
      it('exposes every article via getAllManualArticles', async () => {
        const articles = await getAllManualArticles(locale);
        const slugs = articles.map((a) => a.slug).sort();
        expect(slugs).toEqual([...ALL_SLUGS].sort());
      });

      it('lists the locale as available for every slug', () => {
        for (const slug of ALL_SLUGS) {
          expect(getManualArticleAvailableLocales(slug)).toContain(locale);
        }
      });

      for (const slug of ALL_SLUGS) {
        it(`getManualArticle('${slug}') returns non-empty title, excerpt and content`, async () => {
          const article = await getManualArticle(slug, locale);
          expect(article).not.toBeNull();
          if (!article) return;
          expect(article.metadata.slug).toBe(slug);
          expect(article.metadata.title.trim()).not.toBe('');
          expect(article.metadata.excerpt.trim()).not.toBe('');
          expect(article.content.trim()).not.toBe('');
        });
      }
    });
  }
});
