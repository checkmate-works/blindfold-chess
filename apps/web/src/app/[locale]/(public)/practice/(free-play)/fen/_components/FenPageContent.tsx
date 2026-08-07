import type { Locale } from '@/app/[locale]/_lib/types';

import { FenSetup } from './FenSetup';

type Props = {
  locale: Locale;
};

export function FenPageContent({ locale }: Props) {
  return <FenSetup locale={locale} />;
}
