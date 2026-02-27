import type { Locale } from '@/app/[locale]/_lib/types';

import { BulkDeleteClient } from './_components/BulkDeleteClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function BulkDeletePage({ params }: Props) {
  const { locale } = await params;

  return <BulkDeleteClient locale={locale} />;
}
