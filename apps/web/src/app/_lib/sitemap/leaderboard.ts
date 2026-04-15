import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';

import {
  MODULES,
  MODULE_KEYS,
  MODULE_TO_SLUG,
  VALID_PERIODS,
} from '@/app/[locale]/(public)/leaderboard/_lib/types';

import { BASE_URL, generateAlternates } from './shared';

/**
 * Dynamic pages - Leaderboard (category-first canonical URLs).
 *
 * Emits only non-redirect, 200-returning endpoints under the
 * `/leaderboard/score/...` and `/leaderboard/exp/...` category-first
 * hierarchy. The legacy period-first paths (`/leaderboard/[period]/...`)
 * and the bare `/leaderboard` index are intentionally omitted — they 308
 * to the canonical shapes emitted here, and listing redirect sources in a
 * sitemap dilutes crawl budget for no SEO gain.
 *
 * Emitted paths (per locale, with hreflang alternates):
 *   - Score top:        /leaderboard/score/{period}                        × 3 periods
 *   - Score middle hub: /leaderboard/score/{period}/{module-slug}          × 3 × 6 modules
 *   - Score detail:     /leaderboard/score/{period}/{module-slug}/{key}    (variant modules only)
 *   - Exp top:          /leaderboard/exp/{period}                          × 3 periods
 *
 * Detail leaves are skipped for modules whose only key is `default`
 * (square_colors, diagonal_quiz, board_symmetry). Those modules are fully
 * represented by their middle hub — the detail page would share the same
 * ranking table and create duplicate-content noise for crawlers.
 */
export function buildLeaderboardEntries(now: Date): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  const leaderboardPaths: string[] = [];
  for (const period of VALID_PERIODS) {
    // Score top
    leaderboardPaths.push(`/leaderboard/score/${period}`);
    // Score middle hubs (one per module). `mod` (not `module`) because
    // `module` is a reserved globals-shadowing variable name under
    // `@next/next/no-assign-module-variable`.
    for (const mod of MODULES) {
      const slug = MODULE_TO_SLUG[mod];
      leaderboardPaths.push(`/leaderboard/score/${period}/${slug}`);
      // Score detail leaves — only for modules with real variant keys
      for (const key of MODULE_KEYS[mod]) {
        if (key === 'default') continue;
        leaderboardPaths.push(`/leaderboard/score/${period}/${slug}/${key}`);
      }
    }
    // Exp top
    leaderboardPaths.push(`/leaderboard/exp/${period}`);
  }

  for (const routePath of leaderboardPaths) {
    for (const locale of SUPPORTED_LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}${routePath}`,
        lastModified: now,
        alternates: generateAlternates(routePath),
      });
    }
  }

  return entries;
}
