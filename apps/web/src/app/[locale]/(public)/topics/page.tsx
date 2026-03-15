import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CardLink, Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.topics' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'topics' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function TopicsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'topics' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <div className="space-y-4">
          <CardLink
            href="/topics/squares"
            icon="♟"
            title={t('categories.squares.title')}
            description={t('categories.squares.description')}
            locale={locale}
          />
        </div>

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
