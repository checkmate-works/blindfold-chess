import type { ReactNode } from 'react';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';

import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  pageTitle: string;
  sectionTitle: string;
  /** Topic-specific header rendered below the section title (board, opening cards, etc.) */
  topicHeader?: ReactNode;
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
    <div className="space-y-8">
      <PageTitle>{pageTitle}</PageTitle>

      <PagePanel>
        <SectionTitle>{sectionTitle}</SectionTitle>

        {topicHeader}

        <AdBanner slot="banner-wide" />

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

        <AdBanner slot="banner-standard" />

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
