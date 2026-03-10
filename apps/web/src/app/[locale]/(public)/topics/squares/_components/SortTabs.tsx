'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { Link } from '@/i18n/routing';

import type { SortMode } from '../_lib/queries';

const SORT_MODES: SortMode[] = ['new', 'popular', 'active'];

type SortTabsProps = {
  square: string;
  locale: string;
};

export function SortTabs({ square, locale }: SortTabsProps) {
  const t = useTranslations('topics.squares.sort');
  const searchParams = useSearchParams();
  const rawSort = searchParams.get('sort');
  const currentSort: SortMode = SORT_MODES.includes(rawSort as SortMode)
    ? (rawSort as SortMode)
    : 'new';

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
                  ? `/topics/squares/${square}`
                  : `/topics/squares/${square}?sort=${mode}`
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
