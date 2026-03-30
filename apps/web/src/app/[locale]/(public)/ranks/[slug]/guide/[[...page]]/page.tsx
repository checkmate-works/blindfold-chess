/**
 * Rank Guide Page (段級位ガイド)
 *
 * @description
 * Displays paginated guide content for a specific belt rank.
 * Supports optional catch-all route for pagination: /guide (page 1), /guide/2 (page 2), etc.
 *
 * @flow
 * 1. Validate slug is a known rank and page number is valid.
 * 2. Fetch rank from DB, check requirements and guide pages exist.
 * 3. Render belt color bar, rank name, guide content, and pagination navigation.
 */
import React from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { AllAnchorPointsBoard } from '@/app/[locale]/(public)/ranks/_components/AllAnchorPointsBoard';
import { AnchorPointsBoard } from '@/app/[locale]/(public)/ranks/_components/AnchorPointsBoard';
import { HighlightQuadrantBoard } from '@/app/[locale]/(public)/ranks/_components/HighlightQuadrantBoard';
import { MiniBoard } from '@/app/[locale]/(public)/ranks/_components/MiniBoard';
import { QuadrantBoard } from '@/app/[locale]/(public)/ranks/_components/QuadrantBoard';
import { RankHeader } from '@/app/[locale]/(public)/ranks/_components/RankHeader';
import { Step3Board } from '@/app/[locale]/(public)/ranks/_components/Step3Board';
import { SymmetryBoard } from '@/app/[locale]/(public)/ranks/_components/SymmetryBoard';
import { getBeltColorHex, getValidatedRank } from '@/app/[locale]/(public)/ranks/_lib/helpers';
import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
    page?: string[];
  }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.flatMap((locale) =>
    ALL_RANK_SLUGS.flatMap((slug) => [
      { locale, slug, page: undefined },
      { locale, slug, page: ['2'] },
    ])
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, page: pageParam } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.rankGuide' });
  const ranksT = await getTranslations({ locale, namespace: 'ranks' });

  const isValidSlug = (ALL_RANK_SLUGS as readonly string[]).includes(slug);
  if (!isValidSlug) return {};

  const pageNumber = pageParam?.[0] ? parseInt(pageParam[0], 10) : 1;

  // Redirect /guide/1 to /guide for canonical URL consistency
  if (pageNumber === 1 && pageParam?.length) {
    redirect(`/${locale}/ranks/${slug}/guide`);
  }

  const rankName = ranksT(`rankNames.${slug as RankSlug}`);
  const canonicalPath =
    pageNumber > 1 ? `ranks/${slug}/guide/${pageNumber}` : `ranks/${slug}/guide`;

  return {
    ...generateCanonicalMetadata({ locale, path: canonicalPath }),
    title:
      pageNumber > 1
        ? `${t('title', { rankName })} - Page ${pageNumber}`
        : t('title', { rankName }),
    description: t('description', { rankName }),
  };
}

export default async function RankGuidePage({ params }: Props) {
  const { locale, slug, page: pageParam } = await params;

  // Validate page param: only single segment allowed
  if (pageParam && pageParam.length > 1) notFound();

  const pageNumber = pageParam?.[0] ? parseInt(pageParam[0], 10) : 1;
  if (isNaN(pageNumber) || pageNumber < 1) notFound();

  // Redirect /guide/1 to /guide for canonical URL consistency
  if (pageNumber === 1 && pageParam?.length) {
    redirect(`/${locale}/ranks/${slug}/guide`);
  }

  const result = await getValidatedRank(slug);
  if (!result) notFound();
  const { rankSlug } = result;

  const t = await getTranslations({ locale, namespace: 'ranks' });
  const beltColor = getBeltColorHex(rankSlug);
  const rankName = t(`rankNames.${rankSlug}`);

  // Check if guide pages exist for this slug
  const guidePages = t.raw('detail.guidePages') as Record<string, Array<{ paragraphs: string[] }>>;
  const hasGuide = rankSlug in guidePages;

  if (!hasGuide) {
    notFound();
  }

  const pages = guidePages[rankSlug];
  if (pageNumber > pages.length) notFound();

  const currentPage = pages[pageNumber - 1];

  return (
    <div className="space-y-8">
      <PageTitle>{rankName}</PageTitle>

      <PagePanel>
        <RankHeader beltColor={beltColor}>{t('detail.guide')}</RankHeader>

        <Divider />

        {/* Page content */}
        <div className="space-y-4">
          {currentPage.paragraphs.map((paragraph, i) => (
            <React.Fragment key={i}>
              {paragraph.includes('\n') ? (
                <p className="text-foreground/80">
                  <strong className="block">{paragraph.split('\n')[0]}</strong>
                  {paragraph.split('\n').slice(1).join('\n')}
                </p>
              ) : (
                <p className="text-foreground/80">{paragraph}</p>
              )}
              {/* Visual aids based on page and position */}
              {pageNumber === 1 && i === 1 && rankSlug === '5kyu' && <AnchorPointsBoard />}
              {pageNumber === 1 && i === 3 && rankSlug === '5kyu' && <QuadrantBoard />}
              {pageNumber === 1 && i === 4 && rankSlug === '5kyu' && <MiniBoard />}
              {pageNumber === 1 && i === 6 && rankSlug === '5kyu' && <SymmetryBoard />}
              {pageNumber === 2 && i === 0 && rankSlug === '5kyu' && <AllAnchorPointsBoard />}
              {pageNumber === 2 && i === 5 && rankSlug === '5kyu' && (
                <HighlightQuadrantBoard quadrant="top-right" />
              )}
              {pageNumber === 2 && i === 6 && rankSlug === '5kyu' && (
                <MiniBoard quadrant="top-right" highlightedSquares={['e5']} />
              )}
              {pageNumber === 2 && i === 7 && rankSlug === '5kyu' && <Step3Board />}
            </React.Fragment>
          ))}
        </div>

        {/* Pagination */}
        {pages.length > 1 && (
          <>
            <Divider />
            <div className="flex items-center justify-between">
              {pageNumber > 1 ? (
                <Link
                  href={`/${locale}/ranks/${rankSlug}/guide${pageNumber === 2 ? '' : `/${pageNumber - 1}`}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← {t('detail.prevPage')}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-muted-foreground">
                {t('detail.pageOf', { current: pageNumber, total: pages.length })}
              </span>
              {pageNumber < pages.length ? (
                <Link
                  href={`/${locale}/ranks/${rankSlug}/guide/${pageNumber + 1}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('detail.nextPage')} →
                </Link>
              ) : (
                <span />
              )}
            </div>
          </>
        )}

        <Divider />

        <Breadcrumb
          items={[
            { label: t('pageTitle'), href: '/ranks' },
            { label: rankName, href: `/ranks/${rankSlug}` },
            { label: t('detail.guide') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
