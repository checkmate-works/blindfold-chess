import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageTitle } from '../_components/PageTitle';
import { generateCanonicalMetadata } from '../_lib/metadata';
import { PreferencesTabs } from './_components/PreferencesTabs';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.preferences' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'preferences' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function PreferencesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Preferences' });

  return (
    <>
      <PageTitle>{t('title')}</PageTitle>
      <div className="mt-4">
        <PreferencesTabs locale={locale} />
      </div>
    </>
  );
}
