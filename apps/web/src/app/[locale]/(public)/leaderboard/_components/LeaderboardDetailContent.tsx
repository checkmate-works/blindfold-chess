'use client';

import { type ReactNode } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PaginationNav, SectionTitle } from '@/app/[locale]/_components';

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
  currentUserId: string | null;
  data: LeaderboardResult;
  currentPage: number;
  // Builds the href for a given page number. Owned by the host page because it
  // holds the URL pieces (locale, module slug, key); navigation is link-based
  // and SSR, matching every other paginated list in the app (PaginationNav).
  buildHref: (page: number) => string;
  // Optional slot rendered immediately below the SectionTitle. Accepts a
  // pre-constructed React element (e.g., <PeriodSelector ... />) so the host
  // page owns the href data and the nested component stays presentational.
  periodSelector?: ReactNode;
};

export function LeaderboardDetailContent({
  locale,
  period,
  module,
  settingKey,
  currentUserId,
  data,
  currentPage,
  buildHref,
  periodSelector,
}: Props) {
  const t = useTranslations('leaderboard');

  const title = t(`cardTitle.${module}.${settingKey}`);
  const periodLabel = t(`period.${period}`);
  const totalPages = Math.ceil(data.totalCount / PAGE_SIZE);

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
        />
        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
