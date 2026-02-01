'use client';

import type { Locale } from '@/app/[locale]/_lib/types';

import { RoutePlannerSettings } from './RoutePlannerSettings';

type Props = {
  locale: Locale;
};

export function RoutePlannerPageContent({ locale }: Props) {
  return <RoutePlannerSettings locale={locale} />;
}
