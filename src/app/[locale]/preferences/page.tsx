import { getTranslations } from 'next-intl/server';
import { PreferencesTabs } from './_components/PreferencesTabs';

interface PreferencesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PreferencesPage({ params }: PreferencesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Preferences' });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
      <PreferencesTabs locale={locale} />
    </div>
  );
}
