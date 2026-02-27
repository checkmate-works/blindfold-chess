import type { Locale } from '@/app/[locale]/_lib/types';

import { Step2Client } from './Step2Client';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function Step2Page(props: Props) {
  const { locale } = await props.params;

  return <Step2Client locale={locale} />;
}
