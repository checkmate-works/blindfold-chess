import { getTranslations } from 'next-intl/server';

import { executeMove, validateFenStructure } from '@blindfold-chess/features/chess-core';

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
  const { from, fen: fenParam, solution: solutionParam } = await searchParams;
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

  // Seed the board from `?fen=` (e.g. "create a puzzle from this game
  // position"), ignored when malformed. An optional `?solution=` SAN move
  // (the game's continuation) seeds the first solution move, but only when it
  // is legal from the seeded position — otherwise the position is seeded alone.
  const injectedFen =
    typeof fenParam === 'string' && validateFenStructure(fenParam).ok ? fenParam : undefined;
  const continuation =
    injectedFen && typeof solutionParam === 'string'
      ? executeMove(injectedFen, solutionParam)
      : null;
  const injectedSolution = continuation ? [continuation.moveResult.san] : undefined;

  const form = (
    <CreatePuzzleForm
      displayName={displayName}
      disableUnsavedGuard={!user}
      availableThemes={availableTags.themes}
      availableChunks={availableTags.chunks}
      forkSeed={forkSeed}
      injectedFen={injectedFen}
      injectedSolution={injectedSolution}
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
