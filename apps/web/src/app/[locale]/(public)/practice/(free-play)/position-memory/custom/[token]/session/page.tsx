import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CustomPositionSession } from '../../../_components/single-position/CustomPositionSession';
import { resolveCustomProblem } from '../../../_lib/custom-problem';
import { clampTimeLimit, parseDisplayMode } from '../../../_lib/session-config';

type Props = {
  params: Promise<{
    locale: Locale;
    token: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });

  return {
    title: resolveTitle(`${t('title')} - ${t('session')}`, locale),
    robots: { index: false, follow: false },
  };
}

export default async function CustomPositionSessionPage({ params, searchParams }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const problem = resolveCustomProblem(token);
  if (!problem) {
    notFound();
  }

  const t = await getTranslations({ locale });
  const sp = await searchParams;
  const timeLimit = clampTimeLimit(sp.timeLimit);
  const displayMode = parseDisplayMode(sp.displayMode);

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.positionMemory.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.positionMemory.title'), href: '/practice/position-memory' },
        { label: t('practice.positionMemory.custom.title') },
      ]}
    >
      <CustomPositionSession
        locale={locale}
        token={token}
        timeLimit={timeLimit}
        displayMode={displayMode}
        position={problem}
      />
    </PracticeSessionPage>
  );
}
