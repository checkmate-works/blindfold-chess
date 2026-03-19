import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import { createClient } from '@/lib/supabase/server';

import type { Locale } from '@/app/[locale]/_lib/types';

import { getLeaderboard } from '../_actions/getLeaderboard';
import { LeaderboardContainer } from '../_components/LeaderboardContainer';
import type { LeaderboardModule, LeaderboardPeriod } from '../_lib/types';
import { VALID_PERIODS } from '../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
    period: string;
  }>;
};

const DEFAULT_MODULE: LeaderboardModule = 'coordinate_quiz';
const DEFAULT_KEY = 'white';

function isValidPeriod(value: string): value is LeaderboardPeriod {
  return (VALID_PERIODS as readonly string[]).includes(value);
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.flatMap((locale) => VALID_PERIODS.map((period) => ({ locale, period })));
}

export default async function LeaderboardPeriodPage({ params }: Props) {
  const { locale, period } = await params;

  if (!isValidPeriod(period)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const initialData = await getLeaderboard(DEFAULT_MODULE, DEFAULT_KEY, period, 1);

  return (
    <LeaderboardContainer
      locale={locale}
      currentUserId={currentUserId}
      initialData={initialData}
      initialModule={DEFAULT_MODULE}
      initialKey={DEFAULT_KEY}
      period={period}
    />
  );
}
