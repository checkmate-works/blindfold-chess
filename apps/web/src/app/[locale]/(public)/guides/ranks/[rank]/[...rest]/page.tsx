/**
 * Rank Guide Deep Route (段級位ガイド 詳細経路)
 *
 * @description
 * Catch-all for paths following the rank root:
 * - `[page]` → flat page 2..N (numeric segment)
 * - `[chapter]` → chapter root (page 1)
 * - `[chapter]/[page]` → chapter page 2..N
 *
 * Numeric first segment = flat page. String first segment = chapter slug.
 * `/1` and `/chapter/1` are redirected to their canonical root URLs.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import enMessages from '@/messages/en.json';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { findChapter, getRankGuide } from '../../../_lib/guideData';
import { parseGuideSegments } from '../../../_lib/parseGuideSegments';
import { renderGuideBody } from '../_lib/renderGuideBody';

type Props = {
  params: Promise<{
    locale: Locale;
    rank: string;
    rest: string[];
  }>;
};

export function generateStaticParams() {
  // Build params from the English messages as the canonical source of truth.
  // This avoids a DB hit during build and matches the pattern used elsewhere
  // in the app (see sitemap.ts).
  const guidesPages = enMessages.guides.pages as Record<string, unknown>;

  const params: { locale: string; rank: string; rest: string[] }[] = [];

  for (const locale of SUPPORTED_LOCALES) {
    for (const rank of ALL_RANK_SLUGS) {
      const guide = getRankGuide(guidesPages, rank);
      if (!guide) continue;

      if (guide.format === 'flat') {
        // Pages 2..N
        for (let page = 2; page <= guide.pages.length; page++) {
          params.push({ locale, rank, rest: [String(page)] });
        }
      } else {
        for (const chapter of guide.chapters) {
          // Chapter root
          params.push({ locale, rank, rest: [chapter.slug] });
          // Chapter pages 2..N
          for (let page = 2; page <= chapter.pages.length; page++) {
            params.push({ locale, rank, rest: [chapter.slug, String(page)] });
          }
        }
      }
    }
  }

  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, rank, rest } = await params;

  if (!(ALL_RANK_SLUGS as readonly string[]).includes(rank)) return {};
  const rankSlug = rank as RankSlug;

  const parsed = parseGuideSegments(rest);
  if (!parsed) return {};

  const tGuides = await getTranslations({ locale, namespace: 'guides' });
  const tRanks = await getTranslations({ locale, namespace: 'ranks' });
  const guidesPages = tGuides.raw('pages') as Record<string, unknown>;
  const guide = getRankGuide(guidesPages, rankSlug);
  if (!guide) return {};

  const rankName = tRanks(`rankNames.${rankSlug}`);

  if (parsed.kind === 'flat-page') {
    if (guide.format !== 'flat') return {};
    if (parsed.page === 1) {
      // Will be redirected by the page component; still emit reasonable metadata.
      return {};
    }
    if (parsed.page > guide.pages.length) return {};
    const tMeta = await getTranslations({ locale, namespace: 'metadata.guides.rank' });
    const title = tMeta('pageTitle', { rankName, page: parsed.page });
    const description = tMeta('description', { rankName });
    return {
      ...generateCanonicalMetadata({
        locale,
        path: `guides/ranks/${rankSlug}/${parsed.page}`,
        title,
        description,
      }),
      title: resolveTitle(title, locale),
      description,
    };
  }

  if (guide.format !== 'chaptered') return {};
  const chapter = findChapter(guide, parsed.chapterSlug);
  if (!chapter) return {};

  const tMeta = await getTranslations({ locale, namespace: 'metadata.guides.chapter' });

  if (parsed.kind === 'chapter-root') {
    const title = tMeta('title', { rankName, chapterName: chapter.title });
    const description = tMeta('description', { rankName, chapterName: chapter.title });
    return {
      ...generateCanonicalMetadata({
        locale,
        path: `guides/ranks/${rankSlug}/${chapter.slug}`,
        title,
        description,
      }),
      title: resolveTitle(title, locale),
      description,
    };
  }

  // chapter-page
  if (parsed.page === 1) return {};
  if (parsed.page > chapter.pages.length) return {};
  const title = tMeta('pageTitle', {
    rankName,
    chapterName: chapter.title,
    page: parsed.page,
  });
  const description = tMeta('description', { rankName, chapterName: chapter.title });
  return {
    ...generateCanonicalMetadata({
      locale,
      path: `guides/ranks/${rankSlug}/${chapter.slug}/${parsed.page}`,
      title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function RankGuideDeepPage({ params }: Props) {
  const { locale, rank, rest } = await params;

  if (!(ALL_RANK_SLUGS as readonly string[]).includes(rank)) notFound();
  const rankSlug = rank as RankSlug;

  const parsed = parseGuideSegments(rest);
  if (!parsed) notFound();

  // Canonical-URL redirects for page 1
  if (parsed.kind === 'flat-page' && parsed.page === 1) {
    redirect(`/${locale}/guides/ranks/${rankSlug}`);
  }
  if (parsed.kind === 'chapter-page' && parsed.page === 1) {
    redirect(`/${locale}/guides/ranks/${rankSlug}/${parsed.chapterSlug}`);
  }

  if (parsed.kind === 'flat-page') {
    return renderGuideBody({
      kind: 'flat',
      locale,
      slug: rankSlug,
      pageNumber: parsed.page,
    });
  }

  if (parsed.kind === 'chapter-root') {
    return renderGuideBody({
      kind: 'chapter-body',
      locale,
      slug: rankSlug,
      chapterSlug: parsed.chapterSlug,
      pageNumber: 1,
    });
  }

  return renderGuideBody({
    kind: 'chapter-body',
    locale,
    slug: rankSlug,
    chapterSlug: parsed.chapterSlug,
    pageNumber: parsed.page,
  });
}
