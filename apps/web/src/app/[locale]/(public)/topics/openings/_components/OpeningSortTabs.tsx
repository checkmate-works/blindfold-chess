'use client';

import { SortTabs } from '@/app/[locale]/(public)/topics/_components';

type Props = {
  slug: string;
  locale: string;
};

export function OpeningSortTabs({ slug, locale }: Props) {
  return (
    <SortTabs
      basePath={`/topics/openings/${slug}`}
      translationKey="topics.openings.sort"
      locale={locale}
    />
  );
}
