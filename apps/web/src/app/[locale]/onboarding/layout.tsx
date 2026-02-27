import { getTranslations } from 'next-intl/server';

import { PageTitle } from '../_components/PageTitle';

type Props = {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
};

export default async function OnboardingLayout({ params, children }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'onboarding' });

  return (
    <>
      <PageTitle>{t('title')}</PageTitle>
      {children}
    </>
  );
}
