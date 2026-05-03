import type { ReactNode } from 'react';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';

import { PageLayout, PaginationNav, SectionTitle } from '@/app/[locale]/_components';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  pageTitle: string;
  sectionTitle: string;
  /** Topic-specific header rendered below the section title (board, opening cards, etc.) */
  topicHeader?: ReactNode;
  /** Ad slot rendered between the topic header and the post list */
  adMiddle?: ReactNode;
  /** Ad slot rendered between the post list and the pagination */
  adBottom?: ReactNode;
  /** Post count display text */
  postCountText: string;
  /** New post button config -- omit to hide the button */
  newPostButton?: {
    href: string;
    label: string;
  };
  /** Sort tabs component */
  sortTabs: ReactNode;
  /** Rendered post cards */
  postCards: ReactNode;
  /** Text shown when there are no posts */
  noPostsText: string;
  /** Whether there are posts to show */
  hasPosts: boolean;
  /** Pagination config */
  pagination: {
    currentPage: number;
    totalPages: number;
    buildHref: (page: number) => string;
  };
  /** Breadcrumb items */
  breadcrumbItems: BreadcrumbItem[];
};

export function TopicListPageLayout({
  locale,
  pageTitle,
  sectionTitle,
  topicHeader,
  adMiddle,
  adBottom,
  postCountText,
  newPostButton,
  sortTabs,
  postCards,
  noPostsText,
  hasPosts,
  pagination,
  breadcrumbItems,
}: Props) {
  return (
    <PageLayout title={pageTitle} locale={locale} breadcrumb={breadcrumbItems}>
      <SectionTitle>{sectionTitle}</SectionTitle>

      {topicHeader}

      {adMiddle}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{postCountText}</p>

        {newPostButton && (
          <Link href={newPostButton.href} locale={locale}>
            <Button variant="primary" asChild>
              {newPostButton.label}
            </Button>
          </Link>
        )}
      </div>

      {sortTabs}

      {hasPosts ? (
        <div className="space-y-3">{postCards}</div>
      ) : (
        <p className="text-muted-foreground text-center py-8">{noPostsText}</p>
      )}

      {adBottom}

      <PaginationNav
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        buildHref={pagination.buildHref}
      />
    </PageLayout>
  );
}
