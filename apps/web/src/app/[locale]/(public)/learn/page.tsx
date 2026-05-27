import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { CardLink, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CATEGORY_STYLES } from './_lib/types';
import { getAvailableCategories, getCategoryCounts } from './_lib/utils';

export const generateStaticParams = generateLocaleStaticParams;

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.learn', path: 'learn' });
}

export default async function LearnPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const categoryCounts = await getCategoryCounts(locale);
  const availableCategories = getAvailableCategories();

  const categoryInfos = availableCategories.map((cat) => ({
    category: cat,
    label: t(`learn.categories.${cat}`),
    count: categoryCounts[cat],
    countLabel: t('learn.articleCount', { count: categoryCounts[cat] }),
  }));

  return (
    <PageLayout
      title={t('learn.title')}
      locale={locale}
      breadcrumb={[{ label: t('navigation.learn') }]}
    >
      <SectionTitle>{t('learn.browseByCategory')}</SectionTitle>

      <div className="space-y-4">
        {categoryInfos.map((info) => {
          const style = CATEGORY_STYLES[info.category];
          // Determine description - for now using a generic one or looking up if exists
          // Since existing code didn't have detailed description per category in utils, we construct it.
          // Accessing style.icon directly for icon.

          return (
            <CardLink
              key={info.category}
              href={`/learn/${info.category}`}
              icon={style.icon}
              title={info.label}
              description={t('learn.articleCount', { count: info.count })}
              locale={locale}
            />
          );
        })}
      </div>

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}
