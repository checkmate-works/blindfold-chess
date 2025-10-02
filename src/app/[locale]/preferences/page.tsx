import { getTranslations } from 'next-intl/server';
import { PreferencesTabs } from './_components/PreferencesTabs';
import { PageTitle } from '../_components/PageTitle';
import { generateCanonicalMetadata } from '../_lib/metadata';
import type { Metadata } from 'next';

interface PreferencesPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PreferencesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.preferences' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'preferences' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function PreferencesPage({ params }: PreferencesPageProps) {
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
