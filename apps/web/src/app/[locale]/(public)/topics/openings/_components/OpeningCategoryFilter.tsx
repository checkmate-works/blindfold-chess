'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { parseAsString, useQueryState } from 'nuqs';

import { OPENING_CATEGORIES } from '../_lib/categories';
import type { OpeningCategory } from '../_lib/categories';

export function OpeningCategoryFilter() {
  const t = useTranslations('topics.openings.categoryFilter');
  const [category, setCategory] = useQueryState('category', parseAsString.withDefault('open'));

  const currentCategory: OpeningCategory = OPENING_CATEGORIES.includes(category as OpeningCategory)
    ? (category as OpeningCategory)
    : 'open';

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="opening-category" className="text-sm font-medium text-muted-foreground">
        {t('label')}
      </label>
      <select
        id="opening-category"
        value={currentCategory}
        onChange={(e) => setCategory(e.target.value)}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {OPENING_CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {t(cat)}
          </option>
        ))}
      </select>
    </div>
  );
}
