import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getOptionalUser } from '@/lib/auth';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { GuestCreateGate } from '@/app/[locale]/_components/GuestCreateGate';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { ChunkForm } from '../_components/ChunkForm';

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
 */
export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'chunks.new',
    path: 'chunks/new',
    omitDescription: true,
  });
}

export default async function NewChunkPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const user = await getOptionalUser();
  const t = await getTranslations({ locale, namespace: 'chunks' });

  const form = <ChunkForm mode="create" disableUnsavedGuard={!user} />;

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
