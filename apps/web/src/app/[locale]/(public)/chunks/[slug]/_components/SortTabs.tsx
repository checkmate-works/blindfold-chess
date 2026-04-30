'use client';

import { SortTabs as SortTabsBase } from '@/app/[locale]/(public)/topics/_components';

type SortTabsProps = {
  slug: string;
  locale: string;
};

export function SortTabs({ slug, locale }: SortTabsProps) {
  return (
    <SortTabsBase
      basePath={`/chunks/${slug}`}
      translationKey="topics.chunks.sort"
      locale={locale}
    />
  );
}
