import { getTranslations } from 'next-intl/server';

import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
};

export default async function OnboardingLayout({ params, children }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'onboarding' });

  return (
    <GamePreferencesProvider>
      <PageTitle>{t('title')}</PageTitle>
      {children}
    </GamePreferencesProvider>
  );
}
