import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getAuthenticatedUser } from '@/lib/auth';
import { countChunkReferences, getChunkBySlug } from '@/lib/chunks/queries';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ChunkPreviewClient } from '../../../_components/ChunkPreviewClient';

/**
 * Preview step in the chunk *edit* flow (mirrors `/chunks/new/preview`).
 *
 * The shell applies the same guards as the edit page — auth, ownership,
 * and the published-lock 404 — then hands off to `ChunkPreviewClient` in
 * edit mode. The actual draft read and the call to `updateChunk` happen
 * client-side there because the sessionStorage handoff cannot be
 * inspected on the server. `editHref` is where "Back to edit" returns.
 *
 * The saved row's identity fields and its live reference counts are read
 * here and passed down: the client can diff the draft against them, but
 * neither is knowable from sessionStorage alone.
 */
type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'chunks.preview' });
  const title = t('title');

  return {
    ...generateCanonicalMetadata({ locale, path: `chunks/${slug}/edit/preview`, title }),
    title: resolveTitle(title, locale),
  };
}

export default async function EditChunkPreviewPage({ params }: Props) {
  const { locale, slug } = await params;
  const user = await getAuthenticatedUser();
  const chunk = await getChunkBySlug(slug);

  if (!chunk || chunk.userId !== user.id) {
    notFound();
  }
  // Published chunks are locked — mirror the edit page's guard so a
  // stale preview URL after a publish 404s instead of rendering.
  if (chunk.status === 'published') {
    notFound();
  }

  const [t, tPreview, references] = await Promise.all([
    getTranslations({ locale, namespace: 'chunks' }),
    getTranslations({ locale, namespace: 'chunks.preview' }),
    // Drives the "others already point at this" warning. Counted here,
    // at the confirmation step, so the number is the one that holds when
    // the save is actually made — however long the form was left open.
    countChunkReferences(chunk.id),
  ]);

  return (
    <PageLayout
      title={tPreview('title')}
      locale={locale}
      breadcrumb={[
        { label: t('listTitle'), href: '/chunks' },
        { label: chunk.title, href: `/chunks/${slug}` },
        { label: t('edit.breadcrumb'), href: `/chunks/${slug}/edit` },
        { label: tPreview('title') },
      ]}
    >
      <ChunkPreviewClient
        mode="edit"
        editHref={`/chunks/${slug}/edit`}
        saved={{
          title: chunk.title,
          slug: chunk.slug,
          representativeFen: chunk.representativeFen,
        }}
        references={references}
      />
    </PageLayout>
  );
}
