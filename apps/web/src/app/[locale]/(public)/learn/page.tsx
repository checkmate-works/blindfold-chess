import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import {
  Breadcrumb,
  CardLink,
  Divider,
  PageDescription,
  PagePanel,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CATEGORY_STYLES } from './_lib/types';
import { getAvailableCategories, getCategoryCounts } from './_lib/utils';

export const dynamic = 'force-static';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ja' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'learn' }),
    title: t('learn.title'),
    description: t('learn.description'),
  };
}

export default async function LearnPage({ params }: Props) {
  const { locale } = await params;
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
    <div className="space-y-8">
      <PageTitle>{t('learn.title')}</PageTitle>

      <PageDescription>{t('learn.description')}</PageDescription>

      <PagePanel>
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

        <Divider />

        <Breadcrumb items={[{ label: t('navigation.learn') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
