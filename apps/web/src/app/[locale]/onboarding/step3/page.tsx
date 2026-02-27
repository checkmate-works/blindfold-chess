import type { Locale } from '@/app/[locale]/_lib/types';

import { Step3Client } from './Step3Client';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function Step3Page(props: Props) {
  const { locale } = await props.params;

  return <Step3Client locale={locale} />;
}
