import { redirect } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LeaderboardIndexPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/leaderboard/all-time`);
}
