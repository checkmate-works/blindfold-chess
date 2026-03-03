import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageDescription, PagePanel, PageTitle } from '@/app/[locale]/_components';

import { UsernameForm } from './_components';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.setupUsername' });

  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function SetupUsernamePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'setupUsername' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PageDescription>{t('description')}</PageDescription>
      <PagePanel>
        <UsernameForm locale={locale} />
      </PagePanel>
    </div>
  );
}
