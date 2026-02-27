import type { Locale } from '@/app/[locale]/_lib/types';

import { LimitReachedClient } from './_components/LimitReachedClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function ManageLimitPage({ params }: Props) {
  const { locale } = await params;

  return <LimitReachedClient locale={locale} />;
}
