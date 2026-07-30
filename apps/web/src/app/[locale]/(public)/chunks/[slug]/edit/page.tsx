import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getAuthenticatedUser } from '@/lib/auth';
import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import { getChunkBySlug, getFeedbackTopicsForChunk } from '@/lib/chunks/queries';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ChunkForm } from '../../_components/ChunkForm';

/**
 * Edit Chunk (チャンク編集)
 *
 * @description Owner-only edit surface for an existing chunk. Non-owners
 * (and unauthenticated viewers, after sign-in redirect) get a 404 to
 * avoid leaking existence information.
 *
 * @flow
 * 1. `getAuthenticatedUser` — guests are redirected to `/sign-in`.
 * 2. Fetch by slug; 404 if missing or soft-deleted.
 * 3. 404 if `user.id !== chunk.userId`.
 * 4. Render `<ChunkForm mode="edit" initial={...}>`.
 */
type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const chunk = await getChunkBySlug(slug);
  const t = await getTranslations({ locale, namespace: 'chunks.edit' });

  if (!chunk) {
    return { title: resolveTitle('Not Found', locale) };
  }

  const title = t('title', { name: chunk.title });

  return {
    ...generateCanonicalMetadata({ locale, path: `chunks/${slug}/edit`, title }),
    title: resolveTitle(title, locale),
  };
}

export default async function EditChunkPage({ params }: Props) {
  const { locale, slug } = await params;
  const user = await getAuthenticatedUser();
  const chunk = await getChunkBySlug(slug);

  if (!chunk || chunk.userId !== user.id) {
    notFound();
  }
  // Published chunks are locked at the application layer — the owner
  // must move them back to draft (via the detail page's Unpublish
  // action) before further field edits are accepted. Returning 404
  // here keeps the edit shell from rendering for a stale URL after a
  // publish, mirroring the server-side guard on `updateChunkEntry`.
  if (chunk.status === 'published') {
    notFound();
  }

  const [t, feedbackTopics] = await Promise.all([
    getTranslations({ locale, namespace: 'chunks' }),
    getFeedbackTopicsForChunk(chunk.id),
  ]);

  return (
    <PageLayout
      title={t('edit.title', { name: chunk.title })}
      locale={locale}
      breadcrumb={[
        { label: t('listTitle'), href: '/chunks' },
        { label: chunk.title, href: `/chunks/${slug}` },
        { label: t('edit.breadcrumb') },
      ]}
    >
      <div className="space-y-6">
        <SectionTitle>{t('edit.title', { name: chunk.title })}</SectionTitle>
        <ChunkForm
          mode="edit"
          initial={{
            id: chunk.id,
            representativeFen: chunk.representativeFen,
            title: chunk.title,
            slug: chunk.slug,
            description: chunk.description,
            annotations: parseBoardAnnotations(chunk.annotations),
            feedbackTopics,
          }}
        />
      </div>
    </PageLayout>
  );
}
