import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CardLink, Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getAllManualArticles } from './_lib/utils';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'manual' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'manual' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function ManualPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'manual' });
  const articles = await getAllManualArticles(locale);

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('articlesTitle')}</SectionTitle>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <CardLink
              key={article.slug}
              href={`/manual/${article.slug}`}
              icon="📖"
              title={article.title}
              description={article.excerpt}
              locale={locale}
            />
          ))}
        </div>

        <AdBanner slot="banner-standard" locale={locale} />

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
