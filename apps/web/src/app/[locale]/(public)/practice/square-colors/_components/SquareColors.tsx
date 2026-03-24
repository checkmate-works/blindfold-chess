'use client';

import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorsSetup } from './SquareColorsSetup';

type Props = {
  locale: Locale;
};

export default function SquareColors({ locale }: Props) {
  return <SquareColorsSetup locale={locale} />;
}
