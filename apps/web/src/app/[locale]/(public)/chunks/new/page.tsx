import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { validateFenStructure } from '@blindfold-chess/features/chess-core';

import { getOptionalUser } from '@/lib/auth';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { GuestCreateGate } from '@/app/[locale]/_components/GuestCreateGate';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps, LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

import { ChunkForm } from '../_components/ChunkForm';
import { parseChunkLinkTarget } from '../_lib/link-target';

/**
 * New Chunk (チャンク新規作成)
 *
 * @description Lets any signed-in user contribute a chunk
 * (piece-coordination pattern) to the public catalog. Guests see the form
 * behind the standard `GuestCreateGate` sign-up overlay.
 *
 * @flow
 * 1. Page loads → `getOptionalUser` resolves the viewer.
 * 2. Signed-in → render `<ChunkForm mode="create">`.
 * 3. Guest → render the same form behind `<GuestCreateGate>`.
 * 4. On submit → `createChunk` Server Action → redirect to `/chunks/<slug>`.
 *
 * A `?fen=` query param (e.g. from a shared game's "create a chunk from this
 * position" link) seeds the board. It is validated structurally here and
 * ignored when malformed, so a stray URL never lands the form in a broken
 * state.
 *
 * `?game=<uuid>&ply=<n>` accompanies `?fen=` when the position came from a
 * shared game's move. It rides along to the create action, which links the
 * new chunk to that move in the same transaction — closing the loop that
 * otherwise left the author on the new chunk's page with the link as manual
 * homework. Shape-validated only (existence and the caller's right to link
 * are re-checked server-side); a malformed pair is dropped and the flow
 * degrades to a plain FEN seed.
 */
export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'chunks.new',
    path: 'chunks/new',
    omitDescription: true,
  });
}

export default async function NewChunkPage({ params, searchParams }: LocaleSearchPageProps) {
  const { locale } = await params;
  const { fen: fenParam, game: gameParam, ply: plyParam } = await searchParams;
  const user = await getOptionalUser();
  const t = await getTranslations({ locale, namespace: 'chunks' });

  const injectedFen =
    typeof fenParam === 'string' && validateFenStructure(fenParam).ok ? fenParam : undefined;

  const form = (
    <ChunkForm
      mode="create"
      disableUnsavedGuard={!user}
      injectedFen={injectedFen}
      // Both halves must be well-formed for the pair to mean anything; a
      // partial or malformed pair degrades to a plain FEN seed rather than
      // sending the create action on an errand it cannot complete.
      injectedLinkTarget={parseChunkLinkTarget(gameParam, plyParam)}
    />
  );

  return (
    <PageLayout
      title={t('new.title')}
      locale={locale}
      breadcrumb={[{ label: t('listTitle'), href: '/chunks' }, { label: t('new.title') }]}
    >
      <div className="space-y-6">
        <SectionTitle>{t('new.title')}</SectionTitle>
        {user ? form : <GuestCreateGate>{form}</GuestCreateGate>}
      </div>
    </PageLayout>
  );
}
