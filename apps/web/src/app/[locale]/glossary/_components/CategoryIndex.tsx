import { getTranslations } from 'next-intl/server';
// Note: Using standard next/link instead of @/i18n/routing Link
// to avoid DYNAMIC_SERVER_USAGE errors in production.
// Server Components should use standard Link with explicit locale in href.
import Link from 'next/link';

import { getCategoryCounts } from '../_lib/queries';
import { CATEGORY_STYLES } from '../_lib/types';

type Props = {
  currentCategory?: string;
  locale: string;
};

export async function CategoryIndex({ currentCategory, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'glossary' });
  const categoryCounts = await getCategoryCounts();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {Object.entries(CATEGORY_STYLES).map(([category, { color, icon }]) => {
        const count = categoryCounts[category] || 0;
        const isActive = currentCategory === category;

        return (
          <Link
            key={category}
            href={`/${locale}/glossary/category/${category}`}
            className={`p-6 rounded-xl shadow-sm border transition-colors ${
              isActive ? 'bg-muted border-foreground/20' : 'bg-card hover:bg-muted/50 border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">{icon}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
                {count} {t('terms')}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">{t(`categories.${category}`)}</h3>
          </Link>
        );
      })}
    </div>
  );
}
