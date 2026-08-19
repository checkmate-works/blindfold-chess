'use client';

import { type ReactNode } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { buildPageHref } from '@/lib/pagination';

import { PaginationNavView, SectionTitle } from '@/app/[locale]/_components';

import {
  type LeaderboardModule,
  type LeaderboardPeriod,
  type LeaderboardResult,
  PAGE_SIZE,
} from '../_lib/types';
import { LeaderboardTable } from './LeaderboardTable';

type Props = {
  locale: string;
  period: LeaderboardPeriod;
  module: LeaderboardModule;
  settingKey: string;
  // Kebab module slug used to build pagination hrefs. Passed as a string (not a
  // pre-built `buildHref` function) because the host is a Server Component and
  // functions cannot cross the server/client boundary.
  moduleSlug: string;
  currentUserId: string | null;
  data: LeaderboardResult;
  currentPage: number;
  // Optional slot rendered immediately below the SectionTitle. Accepts a
  // pre-constructed React element (e.g., <PeriodTabs ... />) so the host
  // page owns the href data and the nested component stays presentational.
  periodSelector?: ReactNode;
};

export function LeaderboardDetailContent({
  locale,
  period,
  module,
  settingKey,
  moduleSlug,
  currentUserId,
  data,
  currentPage,
  periodSelector,
}: Props) {
  const t = useTranslations('leaderboard');
  // This is a Client Component, so it cannot render the async PaginationNav
  // server wrapper — it resolves the same `Common.pagination` labels itself
  // from the client-side provider and feeds the presentational view.
  const tPagination = useTranslations('Common.pagination');

  const title = t(`cardTitle.${module}.${settingKey}`);
  const periodLabel = t(`period.${period}`);
  const totalPages = Math.ceil(data.totalCount / PAGE_SIZE);

  const buildHref = buildPageHref(
    `/${locale}/leaderboard/score/${period}/${moduleSlug}/${settingKey}`
  );

  return (
    <div className="space-y-8">
      <SectionTitle>
        {title}
        <span className="ml-2 text-sm font-normal text-muted-foreground">({periodLabel})</span>
      </SectionTitle>

      {periodSelector}

      <div>
        <LeaderboardTable
          rows={data.rows}
          currentUserId={currentUserId}
          currentUserRank={data.currentUserRank}
          locale={locale}
          viewerHidden={data.viewerHidden}
        />
        <PaginationNavView
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={buildHref}
          labels={{
            navLabel: tPagination('navLabel'),
            previous: tPagination('previous'),
            next: tPagination('next'),
            previousPage: tPagination('previousPage'),
            nextPage: tPagination('nextPage'),
          }}
        />
      </div>
    </div>
  );
}
