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
 *    Exception: Mukyu (無級) is UI-only and bypasses the DB lookup entirely.
 * 3. Render belt color bar, rank name, guide content, and pagination navigation.
 * 4. On the last guide page, display practice links via RequirementsList so users
 *    can immediately navigate to the relevant challenges after finishing the guide.
 *    For Mukyu, links point to learn articles and practice pages instead.
 */
import React from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import { ALL_RANK_SLUGS, isMukyuSlug } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { GuideLinkCard } from '@/app/[locale]/(public)/ranks/_components/GuideLinkCard';
import { RankHeader } from '@/app/[locale]/(public)/ranks/_components/RankHeader';
import { RequirementsList } from '@/app/[locale]/(public)/ranks/_components/RequirementsList';
import { buildRequirementItems, getBeltColorHex } from '@/app/[locale]/(public)/ranks/_lib/helpers';
import { getValidatedRank } from '@/app/[locale]/(public)/ranks/_lib/queries';
import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getGuideInlineLink } from './_lib/guideLinkConfig';
import { getVisualAid } from './_lib/visualAidConfig';

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
      { locale, slug, page: ['3'] },
      { locale, slug, page: ['4'] },
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

  const title =
    pageNumber > 1 ? `${t('title', { rankName })} - Page ${pageNumber}` : t('title', { rankName });
  const description = t('description', { rankName });

  return {
    ...generateCanonicalMetadata({ locale, path: canonicalPath, title, description }),
    title: resolveTitle(title, locale),
    description,
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

  const t = await getTranslations({ locale, namespace: 'ranks' });

  // -----------------------------------------------------------------------
  // Mukyu (無級) — UI-only rank, not stored in DB.
  // Guide content is sourced entirely from i18n.
  // -----------------------------------------------------------------------
  if (isMukyuSlug(slug)) {
    const beltColor = getBeltColorHex(slug);
    const rankName = t(`rankNames.${slug}`);

    const guidePages = t.raw('detail.guidePages') as Record<
      string,
      Array<{ paragraphs: string[] }>
    >;
    if (!(slug in guidePages)) notFound();

    const pages = guidePages[slug];
    if (pageNumber > pages.length) notFound();

    const currentPage = pages[pageNumber - 1];
    const mukyuGuideLinks = t.raw('detail.mukyuGuideLinks') as {
      learnArticle: string;
      practiceLink: string;
      learnArticleLabel: string;
      practiceLabel: string;
      coordinateQuizLabel: string;
      coordinateConfusionLabel: string;
      quadrantsLabel: string;
      '5kyuGuideLabel': string;
    };

    /**
     * Inline links: inserted after specific paragraphs on each page.
     *
     * Page 2:
     * - After paragraph 1 ("以下のトレーニングがおすすめです。") → coordinate quiz
     * - After paragraph 3 ("...興味があれば以下の記事を読んでみるといいでしょう。") → article
     *
     * Page 3:
     * - After paragraph 0 + visual aid ("...4分割して...") → quadrants practice
     * - After paragraph 2 ("このテクニックは5級で習います。") → 5kyu guide
     */
    const getMukyuInlineLink = (paragraphIndex: number): React.ReactNode => {
      if (pageNumber === 1) {
        if (paragraphIndex === 3) {
          return (
            <div className="space-y-3 mt-4">
              <p className="text-foreground/80">{mukyuGuideLinks.learnArticle}</p>
              <GuideLinkCard
                items={[
                  {
                    label: mukyuGuideLinks.learnArticleLabel,
                    href: `/${locale}/learn/notation/algebraic-notation`,
                  },
                ]}
              />
            </div>
          );
        }
      }

      if (pageNumber === 2) {
        if (paragraphIndex === 1) {
          return (
            <GuideLinkCard
              items={[
                {
                  label: mukyuGuideLinks.coordinateQuizLabel,
                  href: `/${locale}/practice/coordinate-quiz`,
                },
              ]}
            />
          );
        }
        if (paragraphIndex === 3) {
          return (
            <GuideLinkCard
              items={[
                {
                  label: mukyuGuideLinks.coordinateConfusionLabel,
                  href: `/${locale}/learn/coordinates/coordinate-confusion`,
                },
              ]}
            />
          );
        }
      }

      if (pageNumber === 3) {
        if (paragraphIndex === 0) {
          return (
            <GuideLinkCard
              items={[
                {
                  label: mukyuGuideLinks.quadrantsLabel,
                  href: `/${locale}/practice/quadrants`,
                },
              ]}
            />
          );
        }
        if (paragraphIndex === 2) {
          return (
            <GuideLinkCard
              items={[
                {
                  label: mukyuGuideLinks['5kyuGuideLabel'],
                  href: `/${locale}/ranks/5kyu/guide`,
                },
              ]}
            />
          );
        }
      }

      return null;
    };

    return (
      <div className="space-y-8">
        <PageTitle>{rankName}</PageTitle>

        <PagePanel>
          <RankHeader beltColor={beltColor}>{t('detail.guide')}</RankHeader>

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
                {getVisualAid(slug, pageNumber, i)}
                {/* Inline links for page 2 */}
                {getMukyuInlineLink(i)}
              </React.Fragment>
            ))}
          </div>

          {/* Pagination */}
          {pages.length > 1 && (
            <>
              <Divider />
              <PaginationNav
                currentPage={pageNumber}
                totalPages={pages.length}
                buildHref={(p) =>
                  p === 1 ? `/${locale}/ranks/${slug}/guide` : `/${locale}/ranks/${slug}/guide/${p}`
                }
              />
            </>
          )}

          <AdBannerGuard slot="banner-standard" />

          <Divider />

          <Breadcrumb
            items={[
              { label: t('pageTitle'), href: '/ranks' },
              { label: rankName, href: `/ranks/${slug}` },
              { label: t('detail.guide') },
            ]}
            locale={locale}
          />
        </PagePanel>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Standard ranks (5kyū–1dan) — DB-backed with challenge score requirements
  // -----------------------------------------------------------------------
  const result = await getValidatedRank(slug);
  if (!result) notFound();
  const { rankSlug, requirements } = result;

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

        {/* Page content */}
        <div className="space-y-4">
          {currentPage.paragraphs.map((paragraph, i) => {
            const linkInfo = getGuideInlineLink(rankSlug, pageNumber, i, locale, t);
            return (
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
                {getVisualAid(rankSlug, pageNumber, i)}
                {/* Inline guide links */}
                {linkInfo && (
                  <GuideLinkCard items={[{ label: linkInfo.label, href: linkInfo.href }]} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Practice links on last page */}
        {pageNumber === pages.length && (
          <>
            <Divider />
            <SectionTitle>{t('detail.tryChallenge')}</SectionTitle>
            <RequirementsList
              className="mt-4 space-y-3"
              iconSize="size-5"
              textSize="text-base"
              items={buildRequirementItems(requirements, locale, t)}
            />
          </>
        )}

        {/* Pagination */}
        {pages.length > 1 && (
          <>
            <Divider />
            <PaginationNav
              currentPage={pageNumber}
              totalPages={pages.length}
              buildHref={(p) =>
                p === 1
                  ? `/${locale}/ranks/${rankSlug}/guide`
                  : `/${locale}/ranks/${rankSlug}/guide/${p}`
              }
            />
          </>
        )}

        <AdBannerGuard slot="banner-standard" />

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
