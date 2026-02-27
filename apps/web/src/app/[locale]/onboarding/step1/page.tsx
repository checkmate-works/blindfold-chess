import type { Locale } from '@/app/[locale]/_lib/types';

import { Step1Client } from './Step1Client';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function Step1Page(props: Props) {
  const { locale } = await props.params;

  return <Step1Client locale={locale} />;
}
