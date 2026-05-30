import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { POINT_CATEGORIES, POINT_EVENT_SOURCE_OPTIONS } from '@/lib/points';

/**
 * Server-rendered GET filter bar for the /admin/coins ledger table. Plain
 * `<form method="get">` so it needs no client JS — submitting reloads the
 * page with the chosen query params, and omitting `page` resets pagination to
 * the first page. `Clear` links back to the bare route.
 *
 * The selects are pre-populated from the current query values so the active
 * filter survives a reload (and is shareable as a URL).
 */
type CoinTransactionFiltersProps = {
  values: {
    source: string;
    category: string;
    direction: string;
    user: string;
  };
};

// Match the /admin/users filter controls: opaque `bg-card` surface so the
// selects/inputs don't blend into the page's `bg-background` main area.
const FIELD_CLASS = 'border border-border rounded px-3 py-2 text-sm bg-card';
const LABEL_CLASS = 'block text-sm font-medium mb-1';

export async function CoinTransactionFilters({ values }: CoinTransactionFiltersProps) {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.coins' });

  return (
    <form method="get" action="/admin/coins" className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="filter-source" className={LABEL_CLASS}>
          {t('filters.source')}
        </label>
        <select
          id="filter-source"
          name="source"
          defaultValue={values.source}
          className={FIELD_CLASS}
        >
          <option value="">{t('filters.all')}</option>
          {POINT_EVENT_SOURCE_OPTIONS.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-category" className={LABEL_CLASS}>
          {t('filters.category')}
        </label>
        <select
          id="filter-category"
          name="category"
          defaultValue={values.category}
          className={FIELD_CLASS}
        >
          <option value="">{t('filters.all')}</option>
          {POINT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`categoryLabels.${category}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-direction" className={LABEL_CLASS}>
          {t('filters.direction')}
        </label>
        <select
          id="filter-direction"
          name="direction"
          defaultValue={values.direction}
          className={FIELD_CLASS}
        >
          <option value="">{t('filters.all')}</option>
          <option value="grant">{t('filters.grantsOnly')}</option>
          <option value="spend">{t('filters.spendsOnly')}</option>
        </select>
      </div>

      <div>
        <label htmlFor="filter-user" className={LABEL_CLASS}>
          {t('filters.user')}
        </label>
        <input
          id="filter-user"
          type="text"
          name="user"
          defaultValue={values.user}
          placeholder={t('filters.userPlaceholder')}
          className={`${FIELD_CLASS} w-72`}
        />
      </div>

      <button
        type="submit"
        className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {t('filters.apply')}
      </button>
      <Link
        href="/admin/coins"
        className="px-4 py-2 rounded border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
      >
        {t('filters.clear')}
      </Link>
    </form>
  );
}
