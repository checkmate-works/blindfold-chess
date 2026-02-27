import { Suspense } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

import { PlayErrorClient } from './_components/PlayErrorClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function PlayErrorPage({ params }: Props) {
  const { locale } = await params;

  return (
    <Suspense>
      <PlayErrorClient locale={locale} />
    </Suspense>
  );
}
