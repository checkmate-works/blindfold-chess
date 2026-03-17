'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { parseAsString, useQueryState } from 'nuqs';

import type { SortMode } from '../_lib/queries';

const SORT_MODES: SortMode[] = ['new', 'popular', 'active'];

type Props = {
  slug: string;
  locale: string;
};

export function OpeningSortTabs({ slug, locale }: Props) {
  const t = useTranslations('topics.openings.sort');
  const [sort] = useQueryState('sort', parseAsString.withDefault('new'));
  const currentSort: SortMode = SORT_MODES.includes(sort as SortMode) ? (sort as SortMode) : 'new';

  return (
    <div className="border-b border-border">
      <nav className="flex">
        {SORT_MODES.map((mode) => {
          const isActive = currentSort === mode;
          return (
            <Link
              key={mode}
              href={
                mode === 'new'
                  ? `/topics/openings/${slug}`
                  : `/topics/openings/${slug}?sort=${mode}`
              }
              locale={locale}
              className={`px-4 py-2 text-sm font-bold ${
                isActive ? 'text-foreground border-b-2 border-foreground' : 'text-muted-foreground'
              }`}
            >
              {t(mode)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
