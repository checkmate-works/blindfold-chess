import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { AlphabeticalIndex } from './_components/AlphabeticalIndex';
import { CategoryIndex } from './_components/CategoryIndex';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'metadata.glossary' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'glossary', title, description }),
    title,
    description,
  };
}

export default async function GlossaryIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'glossary' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <div className="space-y-6">
          <SectionTitle>{t('index.alphabetical')}</SectionTitle>
          <AlphabeticalIndex locale={locale} />
        </div>

        <div className="space-y-6">
          <SectionTitle>{t('index.byCategory')}</SectionTitle>
          <CategoryIndex locale={locale} />
        </div>

        <AdBannerGuard slot="banner-standard" />

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
