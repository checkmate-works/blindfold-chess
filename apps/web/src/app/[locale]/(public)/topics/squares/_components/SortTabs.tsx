'use client';

import { SortTabs as SortTabsBase } from '@/app/[locale]/(public)/topics/_components';

type SortTabsProps = {
  square: string;
  locale: string;
};

export function SortTabs({ square, locale }: SortTabsProps) {
  return (
    <SortTabsBase
      basePath={`/topics/squares/${square}`}
      translationKey="topics.squares.sort"
      locale={locale}
    />
  );
}
