import { redirect } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

import { VALID_PERIODS } from '../_lib/types';
import { isValidPeriod } from '../_lib/validators';

type Props = {
  params: Promise<{
    locale: Locale;
    period: string;
  }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.flatMap((locale) => VALID_PERIODS.map((period) => ({ locale, period })));
}

export default async function LeaderboardPeriodRedirect({ params }: Props) {
  const { locale, period } = await params;

  if (isValidPeriod(period)) {
    redirect(`/${locale}/leaderboard?period=${period}`);
  }

  redirect(`/${locale}/leaderboard`);
}
