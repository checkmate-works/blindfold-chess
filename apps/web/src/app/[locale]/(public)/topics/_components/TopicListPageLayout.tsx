import type { ReactNode } from 'react';

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
  /** Pre-rendered post cards (already mapped). */
  postCards: ReactNode;
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
  hasPosts,
  pagination,
  breadcrumbItems,
}: Props) {
  return (
    <PageLayout title={pageTitle} locale={locale} breadcrumb={breadcrumbItems}>
      <SectionTitle>{sectionTitle}</SectionTitle>

      {topicHeader}

      {communitySection}

      {hasPosts && <div className="space-y-3">{postCards}</div>}

      <PaginationNav
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        buildHref={pagination.buildHref}
        locale={locale}
      />
    </PageLayout>
  );
}
