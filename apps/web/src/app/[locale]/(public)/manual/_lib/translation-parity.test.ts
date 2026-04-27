import { SUPPORTED_LOCALES } from '@/config';
import { describe, expect, it } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import { MANUAL_ARTICLE_SLUGS } from './types';
import { getManualArticle, getManualArticleAvailableLocales } from './utils';

const ALL_SLUGS = Object.values(MANUAL_ARTICLE_SLUGS);

const countMatches = (text: string, pattern: RegExp): number => {
  return text.match(pattern)?.length ?? 0;
};

const headingCounts = (markdown: string) => ({
  h1: countMatches(markdown, /^# [^\n]+$/gm),
  h2: countMatches(markdown, /^## [^\n]+$/gm),
  h3: countMatches(markdown, /^### [^\n]+$/gm),
});

/**
 * Structural translation-parity guards for the manual articles.
 *
 * These tests catch the failure mode where a translator (human or LLM)
 * accidentally drops a section, drops a `![demo:...]()` placeholder, or
 * forgets to localize an internal link's `/[locale]/...` prefix. Pure
 * non-empty assertions in `utils.test.ts` cannot catch these regressions
 * because the resulting article still parses and renders — it just
 * silently lacks a heading or the demo board widget.
 */
describe('manual content — structural translation parity', () => {
  for (const slug of ALL_SLUGS) {
    describe(`slug ${slug}`, () => {
      it('every locale shares the same heading skeleton (h1/h2/h3 counts)', async () => {
        const counts: Partial<Record<Locale, ReturnType<typeof headingCounts>>> = {};
        for (const locale of SUPPORTED_LOCALES) {
          const article = await getManualArticle(slug, locale);
          expect(article).not.toBeNull();
          if (!article) return;
          counts[locale] = headingCounts(article.content);
        }
        const enCounts = counts.en;
        expect(enCounts).toBeDefined();
        for (const locale of SUPPORTED_LOCALES) {
          expect(counts[locale]).toEqual(enCounts);
        }
      });

      it('every locale preserves the same set of demo placeholders', async () => {
        const placeholderRe = /!\[demo:[^\]]+\]\(\)/g;
        const sets: Partial<Record<Locale, string[]>> = {};
        for (const locale of SUPPORTED_LOCALES) {
          const article = await getManualArticle(slug, locale);
          expect(article).not.toBeNull();
          if (!article) return;
          // Sort to make order-independent comparison safe — the markdown
          // renderer matches by alt text, not position, so a translator
          // legitimately reordering sections must still keep the set.
          sets[locale] = (article.content.match(placeholderRe) ?? []).slice().sort();
        }
        const enSet = sets.en;
        expect(enSet).toBeDefined();
        for (const locale of SUPPORTED_LOCALES) {
          expect(sets[locale]).toEqual(enSet);
        }
      });

      it('every internal /<locale>/ link is prefixed with the matching locale', async () => {
        // Catches the pattern where a translator copies an `(/en/preferences...)`
        // link verbatim into pt-BR.ts instead of `(/pt-BR/preferences...)`.
        // We only check links that already use a locale prefix in en.ts —
        // i.e., the en file is the reference for which links must be
        // localized.
        const enArticle = await getManualArticle(slug, 'en');
        expect(enArticle).not.toBeNull();
        if (!enArticle) return;

        // Match Markdown link targets that start with `/<some-locale>/...`.
        // Only inspect links whose first segment is a known locale.
        const linkTargetRe = /\]\((\/[^\s)]+)\)/g;
        const knownLocales = new Set<string>(SUPPORTED_LOCALES);

        const enLocalizedPaths = new Set<string>();
        for (const match of enArticle.content.matchAll(linkTargetRe)) {
          const target = match[1];
          const firstSegment = target.split('/')[1];
          if (firstSegment && knownLocales.has(firstSegment)) {
            // Strip the locale segment to get the locale-agnostic path.
            const stripped = '/' + target.split('/').slice(2).join('/');
            enLocalizedPaths.add(stripped);
          }
        }

        if (enLocalizedPaths.size === 0) {
          // No localized links in en for this slug — nothing to enforce.
          return;
        }

        for (const locale of SUPPORTED_LOCALES) {
          const article = await getManualArticle(slug, locale);
          expect(article).not.toBeNull();
          if (!article) continue;

          for (const path of enLocalizedPaths) {
            // Each en localized path must appear in this locale, prefixed
            // with this locale's segment. Use a regex anchored to `](` so
            // we only match real link targets.
            const expected = `](/${locale}${path}`;
            expect(
              article.content.includes(expected),
              `Expected article ${slug} (${locale}) to contain link target "${expected}", ` +
                `but it was missing — likely a copy-paste of another locale's link.`
            ).toBe(true);
          }
        }
      });

      it('pt-BR title and excerpt are not byte-identical to en/es/ja (translation sanity)', async () => {
        // Heuristic: the three currently-shipping languages (en, es, ja)
        // and pt-BR all use mutually distinct words for these articles,
        // so a byte-identical title or excerpt strongly suggests an
        // un-translated copy-paste. If a future translation legitimately
        // collides, narrow this assertion rather than weakening it.
        const ptArticle = await getManualArticle(slug, 'pt-BR');
        expect(ptArticle).not.toBeNull();
        if (!ptArticle) return;
        for (const other of ['en', 'es', 'ja'] as const) {
          const otherArticle = await getManualArticle(slug, other);
          expect(otherArticle).not.toBeNull();
          if (!otherArticle) continue;
          expect(
            ptArticle.metadata.title,
            `pt-BR title for "${slug}" is byte-identical to ${other} — likely untranslated`
          ).not.toBe(otherArticle.metadata.title);
          expect(
            ptArticle.metadata.excerpt,
            `pt-BR excerpt for "${slug}" is byte-identical to ${other} — likely untranslated`
          ).not.toBe(otherArticle.metadata.excerpt);
        }
      });
    });
  }
});

describe('manual content — registry edge cases', () => {
  it('getManualArticle returns null for an unknown slug in every locale', async () => {
    for (const locale of SUPPORTED_LOCALES) {
      const result = await getManualArticle('this-slug-does-not-exist', locale);
      expect(result).toBeNull();
    }
  });

  it('getManualArticleAvailableLocales returns [] for an unknown slug', () => {
    expect(getManualArticleAvailableLocales('this-slug-does-not-exist')).toEqual([]);
  });

  it('getManualArticleAvailableLocales returns the full supported set for every known slug', () => {
    // Regression guard for the original bug: the registry must list every
    // SUPPORTED_LOCALES entry for every slug. If a future translation is
    // intentionally partial, narrow this assertion to that slug rather than
    // weakening it across the board.
    for (const slug of ALL_SLUGS) {
      const locales = getManualArticleAvailableLocales(slug).slice().sort();
      expect(locales).toEqual([...SUPPORTED_LOCALES].sort());
    }
  });
});
