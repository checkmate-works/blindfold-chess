'use client';

import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizPageContent } from './DiagonalQuizPageContent';

type Props = {
  locale: Locale;
};

export default function DiagonalQuiz({ locale }: Props) {
  return <DiagonalQuizPageContent locale={locale} />;
}
