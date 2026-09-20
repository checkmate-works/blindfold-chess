import type { ReactNode } from 'react';

import { withNativeAdCard } from '@/lib/ads/in-list-placement';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  pageTitle: string;
  sectionTitle: string;
  /** Topic-specific header rendered below the section title (board, opening cards, etc.) */
  topicHeader?: ReactNode;
  /**
   * Comment-section block rendered between the topic header and the post
   * list. Owned by the page so it can compose the SectionTitle, the inline
   * new-post CTA / form, and the sort switcher under one auth / rate-limit
   * conditional. Replaces the old `postCountText` + `newPostButton` +
   * `sortSelect` props.
   */
  communitySection: ReactNode;
  /**
   * Pre-rendered post cards (already mapped). An array rather than a single
   * node so the layout can splice {@link Props.nativeAd} into it — a page
   * that handed over finished markup would have to place the ad itself, and
   * both threads would then own a copy of the placement rule.
   */
  postCards: ReactNode[];
  /**
   * The thread's native ad card, or nothing. Placed by
   * `withNativeAdCard`, which also absorbs the "no card" case — including
   * the repertoires tab, where the page passes no posts and an ad alone
   * would be the only thing in the list.
   */
  nativeAd?: ReactNode;
  /** Whether there are posts to render in the post list. */
  hasPosts: boolean;
  pagination: {
    currentPage: number;
    totalPages: number;
    buildHref: (page: number) => string;
  };
  breadcrumbItems: BreadcrumbItem[];
};

export function TopicListPageLayout({
  locale,
  pageTitle,
  sectionTitle,
  topicHeader,
  communitySection,
  postCards,
  nativeAd,
  hasPosts,
  pagination,
  breadcrumbItems,
}: Props) {
  return (
    <PageLayout title={pageTitle} locale={locale} breadcrumb={breadcrumbItems}>
      <SectionTitle>{sectionTitle}</SectionTitle>

      {topicHeader}

      {communitySection}

      {hasPosts && <div className="space-y-3">{withNativeAdCard(postCards, nativeAd ?? null)}</div>}

      <PaginationNav
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        buildHref={pagination.buildHref}
        locale={locale}
      />
    </PageLayout>
  );
}
