import { getTranslations } from 'next-intl/server';
import { PreferencesTabs } from './_components/PreferencesTabs';
import { PageTitle } from '../_components/PageTitle';

interface PreferencesPageProps {
  params: Promise<{ locale: string }>;
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
