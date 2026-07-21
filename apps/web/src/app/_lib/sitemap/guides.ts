import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';
import enMessages from '@/messages/en.json';
import { statSync } from 'node:fs';
import path from 'node:path';

import { enumerateGuideRoutes, guideRouteToSegments } from '@/lib/guides';

import { BASE_URL, generateAlternates } from './shared';

/**
 * Dynamic pages - Rank guide pages (hub at /guides is in static pages).
 * Uses the shared `enumerateGuideRoutes` helper so the sitemap, route
 * `generateStaticParams`, and any future enumerators all walk the same tree.
 *
 * `lastModified` for guide entries is derived from the mtime of the English
 * message file. Using the file mtime instead of `now` keeps the sitemap's
 * "freshness signal" stable across deploys — Google penalises spurious
 * `lastmod` churn, and every build would otherwise bump the timestamp for
 * content that did not change. The English file is the canonical source of
 * truth for guide content; ja/es are translations of it.
 *
 * Falls back to `now` if `statSync` throws (e.g. a test sandbox without
 * real filesystem access for this path).
 */
export function buildGuideEntries(now: Date): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  const messagesEnPath = path.join(process.cwd(), 'src/messages/en.json');
  let guidesLastModified: Date;
  try {
    guidesLastModified = statSync(messagesEnPath).mtime;
  } catch {
    guidesLastModified = now;
  }

  const guideRoutes = enumerateGuideRoutes(enMessages.guides.pages as Record<string, unknown>);
  for (const route of guideRoutes) {
    const routePath = `/dojo/guides/${guideRouteToSegments(route).join('/')}`;
    for (const locale of SUPPORTED_LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}${routePath}`,
        lastModified: guidesLastModified,
        alternates: generateAlternates(routePath),
      });
    }
  }

  return entries;
}
