import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import { createClient } from '@/lib/supabase/server';

import { Divider, PagePanel } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getLeaderboard } from '../../../_actions/getLeaderboard';
import { LeaderboardDetailContent } from '../../../_components/LeaderboardDetailContent';
import {
  ALL_LEADERBOARD_ENTRIES,
  VALID_PERIODS,
  moduleToSlug,
  slugToModule,
} from '../../../_lib/types';
import { isValidKey, isValidPeriod } from '../../../_lib/validators';

type Props = {
  params: Promise<{
    locale: Locale;
    period: string;
    module: string;
    key: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.flatMap((locale) =>
    VALID_PERIODS.flatMap((period) =>
      ALL_LEADERBOARD_ENTRIES.map(({ module, key }) => ({
        locale,
        period,
        module: moduleToSlug(module),
        key,
      }))
    )
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, period, module: moduleSlug, key } = await params;

  if (!isValidPeriod(period)) return {};

  const resolvedModule = slugToModule(moduleSlug);
  if (!resolvedModule || !isValidKey(resolvedModule, key)) return {};

  const t = await getTranslations({ locale, namespace: 'leaderboard' });

  const title = t(`cardTitle.${resolvedModule}.${key}`);
  const periodLabel = t(`period.${period}`);

  return {
    title: `${title} (${periodLabel}) — ${t('title')}`,
  };
}

export default async function LeaderboardDetailPage({ params, searchParams }: Props) {
  const { locale, period, module: moduleSlug, key } = await params;
  const { page: pageParam } = await searchParams;

  if (!isValidPeriod(period)) notFound();

  const resolvedModule = slugToModule(moduleSlug);
  if (!resolvedModule || !isValidKey(resolvedModule, key)) notFound();

  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const data = await getLeaderboard(resolvedModule, key, period, page);
  const t = await getTranslations({ locale, namespace: 'leaderboard' });
  const detailTitle = t(`cardTitle.${resolvedModule}.${key}`);

  return (
    <PagePanel>
      <LeaderboardDetailContent
        locale={locale}
        period={period}
        module={resolvedModule}
        settingKey={key}
        currentUserId={currentUserId}
        data={data}
        currentPage={page}
      />

      <Divider />

      <Breadcrumb
        items={[{ label: t('title'), href: '/leaderboard' }, { label: detailTitle }]}
        locale={locale}
      />
    </PagePanel>
  );
}
