import { getTranslations } from 'next-intl/server';

import { getOptionalUser } from '@/lib/auth';
import { loadPositionCreateContext } from '@/lib/positions/create-page-context';
import { loadPuzzleForkSeed } from '@/lib/positions/fork';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { GuestCreateGate } from '@/app/[locale]/_components/GuestCreateGate';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { CreatePuzzleForm } from '../_components/CreatePuzzleForm';

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'practice.puzzle',
    path: 'practice/puzzle/new',
    titleKey: 'create.title',
    omitDescription: true,
  });
}

export default async function NewPuzzlePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { from } = await searchParams;
  const user = await getOptionalUser();
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const { displayName, forkSeed, availableTags } = await loadPositionCreateContext({
    user,
    from,
    locale,
    segment: 'puzzle',
    loadForkSeed: loadPuzzleForkSeed,
  });

  const form = (
    <CreatePuzzleForm
      displayName={displayName}
      disableUnsavedGuard={!user}
      availableThemes={availableTags.themes}
      availableChunks={availableTags.chunks}
      forkSeed={forkSeed}
    />
  );

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('title'), href: '/practice/puzzle' },
        { label: t('create.title') },
      ]}
    >
      <div className="space-y-6">
        <SectionTitle>{t('create.title')}</SectionTitle>
        {user ? form : <GuestCreateGate>{form}</GuestCreateGate>}
      </div>
    </PageLayout>
  );
}
