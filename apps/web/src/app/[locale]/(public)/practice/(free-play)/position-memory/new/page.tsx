import { getTranslations } from 'next-intl/server';

import { getOptionalUser } from '@/lib/auth';
import { loadPositionCreateContext } from '@/lib/positions/create-page-context';
import { loadPositionForkSeed } from '@/lib/positions/fork';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { GuestCreateGate } from '@/app/[locale]/_components/GuestCreateGate';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { CreatePositionForm } from '../_components/CreatePositionForm';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const title = t('create.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory/new', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function NewPositionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { from } = await searchParams;
  const user = await getOptionalUser();
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const { displayName, forkSeed, availableTags } = await loadPositionCreateContext({
    user,
    from,
    locale,
    segment: 'position-memory',
    loadForkSeed: loadPositionForkSeed,
  });

  const form = (
    <CreatePositionForm
      displayName={displayName}
      disableUnsavedGuard={!user}
      availableThemes={availableTags.themes}
      availableChunks={availableTags.chunks}
      forkSeed={forkSeed}
    />
  );

  return (
    <PageLayout
      title={t('list.title')}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/position-memory' },
        { label: t('create.title') },
      ]}
    >
      <SectionTitle>{t('create.title')}</SectionTitle>
      {user ? form : <GuestCreateGate>{form}</GuestCreateGate>}
    </PageLayout>
  );
}
