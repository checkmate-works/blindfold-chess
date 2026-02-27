import { Suspense } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './ResultClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function FenResultPage(props: Props) {
  const { locale } = await props.params;

  return (
    <Suspense>
      <ResultClient locale={locale} />
    </Suspense>
  );
}
