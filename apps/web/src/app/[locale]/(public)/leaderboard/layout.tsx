import type { ReactNode } from 'react';
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

import { SignUpBanner } from './_components/SignUpBanner';

type Props = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'leaderboard' }),
    title: t('leaderboard.title'),
    description: t('leaderboard.description'),
  };
}

export default async function LeaderboardLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'leaderboard' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <Suspense fallback={null}>
        <SignUpBanner locale={locale} />
      </Suspense>

      {children}
    </div>
  );
}
