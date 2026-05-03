import type { ReactNode } from 'react';

import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  pageTitle: string;
  sectionTitle: string;
  /** Topic-specific header rendered below the section title (board, opening cards, etc.) */
  topicHeader?: ReactNode;
  /** Optional ad slot rendered between the topic header and the community section */
  adMiddle?: ReactNode;
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
  /** Optional ad slot rendered between the post list and pagination */
  adBottom?: ReactNode;
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
  adMiddle,
  communitySection,
  postCards,
  hasPosts,
  adBottom,
  pagination,
  breadcrumbItems,
}: Props) {
  return (
    <div className="space-y-8">
      <PageTitle>{pageTitle}</PageTitle>

      <PagePanel>
        <SectionTitle>{sectionTitle}</SectionTitle>

        {topicHeader}

        {adMiddle}

        {communitySection}

        {hasPosts && <div className="space-y-3">{postCards}</div>}

        {adBottom}

        <PaginationNav
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          buildHref={pagination.buildHref}
        />

        <Divider />

        <Breadcrumb items={breadcrumbItems} locale={locale} />
      </PagePanel>
    </div>
  );
}
