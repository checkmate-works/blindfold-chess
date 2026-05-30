import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { Button, Field, Input, Select } from '@/app/admin/_components/forms';

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

export async function CoinTransactionFilters({ values }: CoinTransactionFiltersProps) {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.coins' });

  return (
    <form method="get" action="/admin/coins" className="flex flex-wrap items-end gap-3">
      <Field label={t('filters.source')} htmlFor="filter-source">
        <Select
          surface="card"
          fullWidth={false}
          id="filter-source"
          name="source"
          defaultValue={values.source}
        >
          <option value="">{t('filters.all')}</option>
          {POINT_EVENT_SOURCE_OPTIONS.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t('filters.category')} htmlFor="filter-category">
        <Select
          surface="card"
          fullWidth={false}
          id="filter-category"
          name="category"
          defaultValue={values.category}
        >
          <option value="">{t('filters.all')}</option>
          {POINT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`categoryLabels.${category}`)}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t('filters.direction')} htmlFor="filter-direction">
        <Select
          surface="card"
          fullWidth={false}
          id="filter-direction"
          name="direction"
          defaultValue={values.direction}
        >
          <option value="">{t('filters.all')}</option>
          <option value="grant">{t('filters.grantsOnly')}</option>
          <option value="spend">{t('filters.spendsOnly')}</option>
        </Select>
      </Field>

      <Field label={t('filters.user')} htmlFor="filter-user">
        <Input
          surface="card"
          fullWidth={false}
          id="filter-user"
          type="text"
          name="user"
          defaultValue={values.user}
          placeholder={t('filters.userPlaceholder')}
          className="w-72"
        />
      </Field>

      <Button type="submit" variant="primary">
        {t('filters.apply')}
      </Button>
      <Link
        href="/admin/coins"
        className="px-4 py-2 rounded border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
      >
        {t('filters.clear')}
      </Link>
    </form>
  );
}
