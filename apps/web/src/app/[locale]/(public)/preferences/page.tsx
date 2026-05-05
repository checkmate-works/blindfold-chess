import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { PreferencesTabs } from './_components/PreferencesTabs';

type Props = LocalePageProps;

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'metadata.preferences' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'preferences', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function PreferencesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Preferences' });

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <Suspense>
        <PreferencesTabs locale={locale} />
      </Suspense>
    </PageLayout>
  );
}
