import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getAuthenticatedUser } from '@/lib/auth';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { ChunkPreviewClient } from '../../_components/ChunkPreviewClient';

/**
 * Preview step in the chunk authoring flow (mirrors
 * `/practice/puzzle/new/preview`).
 *
 * The shell auth-guards the page (guests are redirected to sign-in) and
 * lays out the title + breadcrumb. The actual draft read and the call
 * to `createChunk` happen client-side in `ChunkPreviewClient` because
 * the sessionStorage handoff cannot be inspected on the server.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'chunks.preview',
    path: 'chunks/new/preview',
    omitDescription: true,
  });
}

export default async function ChunkPreviewPage({ params }: Props) {
  const { locale } = await params;
  await getAuthenticatedUser();
  const t = await getTranslations({ locale, namespace: 'chunks' });
  const tPreview = await getTranslations({ locale, namespace: 'chunks.preview' });

  return (
    <PageLayout
      title={tPreview('title')}
      locale={locale}
      breadcrumb={[
        { label: t('listTitle'), href: '/chunks' },
        { label: t('new.title'), href: '/chunks/new' },
        { label: tPreview('title') },
      ]}
    >
      <ChunkPreviewClient />
    </PageLayout>
  );
}
