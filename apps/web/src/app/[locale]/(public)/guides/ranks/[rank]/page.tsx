/**
 * Rank Guide Root
 *
 * @description
 * Entry point for a rank guide. For flat ranks, renders the first body page
 * directly (no thin index page). For chaptered ranks, renders the chapter list.
 *
 * @flow
 * 1. Validate rank slug and load the guide definition from i18n.
 * 2. Delegate rendering to {@link renderGuideBody} with the appropriate kind.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import enMessages from '@/messages/en.json';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';
import { buildGuideCanonicalPath, enumerateGuideRoutes, getRankGuide } from '@/lib/guides';

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { renderGuideBody } from './_lib/renderGuideBody';

type Props = {
  params: Promise<{
    locale: Locale;
    rank: string;
  }>;
};

export function generateStaticParams() {
  // Only emit params for ranks that actually have guide content. Ranks with
  // no entry in `guides.pages` (e.g. 2kyu / 1kyu / 1dan today) are skipped.
  const routes = enumerateGuideRoutes(enMessages.guides.pages as Record<string, unknown>);
  const rankSlugs = routes.filter((r) => r.kind === 'root').map((r) => r.slug);
  return SUPPORTED_LOCALES.flatMap((locale) => rankSlugs.map((rank) => ({ locale, rank })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, rank } = await params;

  if (!(ALL_RANK_SLUGS as readonly string[]).includes(rank)) return {};
  const rankSlug = rank as RankSlug;

  const tRanks = await getTranslations({ locale, namespace: 'ranks' });
  const tMeta = await getTranslations({ locale, namespace: 'metadata.guides.rank' });

  const rankName = tRanks(`rankNames.${rankSlug}`);
  const title = tMeta('title', { rankName });
  const description = tMeta('description', { rankName });

  return {
    ...generateCanonicalMetadata({
      locale,
      path: buildGuideCanonicalPath(rankSlug, { kind: 'root' }),
      title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function RankGuideRootPage({ params }: Props) {
  const { locale, rank } = await params;

  // Route layer is the single gate for slug validation. After this check,
  // downstream code (including `renderGuideBody`) trusts `rankSlug`.
  if (!(ALL_RANK_SLUGS as readonly string[]).includes(rank)) notFound();
  const rankSlug = rank as RankSlug;

  // Peek at the guide format to decide which layout to render.
  const tGuides = await getTranslations({ locale, namespace: 'guides' });
  const guidesPages = tGuides.raw('pages') as Record<string, unknown>;
  const guide = getRankGuide(guidesPages, rankSlug);
  if (!guide) notFound();

  if (guide.format === 'flat') {
    return renderGuideBody({ kind: 'flat', locale, slug: rankSlug, pageNumber: 1 });
  }

  return renderGuideBody({ kind: 'chapter-list', locale, slug: rankSlug });
}
