import { getTranslations } from 'next-intl/server';

import { getOptionalUser } from '@/lib/auth';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { GuestCreateGate } from '@/app/[locale]/_components/GuestCreateGate';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { CreatePuzzleSolutionForm } from '../../_components/CreatePuzzleSolutionForm';

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'practice.puzzle',
    path: 'practice/puzzle/new/solution',
    titleKey: 'create.solutionPageTitle',
    omitDescription: true,
  });
}

export default async function PuzzleNewSolutionPage({ params }: Props) {
  const { locale } = await params;
  const user = await getOptionalUser();
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const form = <CreatePuzzleSolutionForm disableUnsavedGuard={!user} />;

  return (
    <PageLayout
      title={t('create.solutionPageTitle')}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('title'), href: '/practice/puzzle' },
        { label: t('create.title'), href: '/practice/puzzle/new' },
        { label: t('create.solutionPageTitle') },
      ]}
    >
      <div className="space-y-6">
        <SectionTitle>{t('create.solutionPageTitle')}</SectionTitle>
        {user ? form : <GuestCreateGate>{form}</GuestCreateGate>}
      </div>
    </PageLayout>
  );
}
