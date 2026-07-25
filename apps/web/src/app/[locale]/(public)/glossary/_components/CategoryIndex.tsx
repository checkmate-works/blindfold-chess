import { getTranslations } from 'next-intl/server';

import { IconTileCard } from '@/app/[locale]/_components/IconTileCard';

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
      {Object.entries(CATEGORY_STYLES).map(([category, { icon }]) => {
        const count = categoryCounts[category] || 0;

        return (
          <IconTileCard
            key={category}
            href={`/${locale}/glossary/category/${category}`}
            active={currentCategory === category}
            icon={<span className="text-2xl leading-none">{icon}</span>}
            title={t(`categories.${category}`)}
            subtitle={
              <p className="text-sm text-muted-foreground">
                {count} {t('terms')}
              </p>
            }
          />
        );
      })}
    </div>
  );
}
