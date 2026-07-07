import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CardLink, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getAllManualArticles } from './_lib/utils';

export const generateStaticParams = generateLocaleStaticParams;

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'manual', path: 'manual' });
}

export default async function ManualPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'manual' });
  const articles = await getAllManualArticles(locale);

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
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

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
