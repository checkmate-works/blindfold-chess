'use client';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { parseAsString, useQueryState } from 'nuqs';

import type { SortMode } from '../_lib/shared';

const SORT_MODES: SortMode[] = ['new', 'popular', 'active'];

type SortTabsProps = {
  basePath: string;
  translationKey: string;
  locale: string;
};

export function SortTabs({ basePath, translationKey, locale }: SortTabsProps) {
  const t = useTranslations(translationKey);
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
              href={mode === 'new' ? basePath : `${basePath}?sort=${mode}`}
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
