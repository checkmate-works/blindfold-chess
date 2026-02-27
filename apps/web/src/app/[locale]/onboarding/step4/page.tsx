import type { Locale } from '@/app/[locale]/_lib/types';

import { Step4Client } from './Step4Client';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function Step4Page(props: Props) {
  const { locale } = await props.params;

  return <Step4Client locale={locale} />;
}
