import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';

import { buildLandingLanguageAlternates, buildLandingUrl } from '@/lib/seo/landing-urls';

import { BASE_URL, generateAlternates } from './shared';

const STATIC_PAGES = [
  '', // Home
  '/privacy',
  '/terms',
  '/company',
  '/contact',
  '/preferences',
  '/faq',
  '/glossary',
  '/manual',
  '/learn',
  '/practice',
  '/practice/algebraic-notation',
  '/practice/coordinate-quiz',
  '/practice/square-colors',
  '/practice/legal-moves',
  '/practice/position-memory',
  '/practice/fen',
  '/practice/knight-tour',
  '/practice/board-symmetry',
  '/practice/diagonal-quiz',
  '/practice/route-planner',
  '/practice/quadrants',
  '/getting-started',
  '/articles',
  '/announcements',
  // Note: `/leaderboard` is intentionally NOT listed here — it is a 308
  // redirect to `/leaderboard/score/all-time`. The canonical category-first
  // leaderboard URLs (`/leaderboard/score/...` and `/leaderboard/exp/...`)
  // are emitted by the leaderboard entry builder so crawlers index only
  // non-redirect, 200-returning canonical endpoints.
  '/ranks',
  '/dojo',
  '/guides',
  '/pricing',
  '/affiliate-disclosure',
  '/topics',
  '/topics/openings',
  '/topics/squares',
  '/interview',
  '/games',
  '/games/new',
  '/games/new/standard',
  '/games/new/pgn',
  '/games/new/position',
  '/games/new/opening',
  '/games/play',
];

/**
 * The root landing page lives at `/` across all languages (not
 * `/[locale]/`), so its sitemap entries do not follow the
 * `generateAlternates` locale-prefix convention. Instead we emit one entry
 * per supported locale using the landing URL shape (`/` for en,
 * `/?lang=<code>` for others), with every entry sharing the same
 * `alternates.languages` map so the hreflang graph is reciprocal.
 */
export function buildRootEntry(now: Date): MetadataRoute.Sitemap {
  const languages = buildLandingLanguageAlternates();
  return SUPPORTED_LOCALES.map((locale) => ({
    url: buildLandingUrl(locale),
    lastModified: now,
    alternates: { languages },
  }));
}

export function buildStaticPageEntries(now: Date): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of SUPPORTED_LOCALES) {
    for (const page of STATIC_PAGES) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: now,
        alternates: generateAlternates(page),
      });
    }
  }
  return entries;
}
