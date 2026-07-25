import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getOptionalUser } from '@/lib/auth';
import { getViewerPendingEditRequestForChunk } from '@/lib/chunk-edit-requests/queries';
import { getChunkBySlug } from '@/lib/chunks/queries';
import { isChunkFeedbackTopic, isChunkStatus } from '@/lib/chunks/validation';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { EditRequestSection } from '../_components/EditRequestSection';

/**
 * Edit Suggestions (チャンクの編集リクエスト)
 *
 * @description Qiita-style "edit request" surface for a draft chunk.
 * Visitors see the chunk's current title + description for context at
 * the top, then the list of submitted suggestions below. Signed-in
 * non-owners get the "Suggest an edit" form; owners see Accept /
 * Reject controls; proposers see Withdraw on their own pending rows.
 *
 * @flow
 * 1. Fetch chunk by slug; 404 if missing / soft-deleted.
 * 2. 404 when the chunk is not in `draft` — published chunks reject
 *    new submissions and have no review surface yet.
 * 3. Render the "current values" panel + `EditRequestSection`.
 */
type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  /** `?topic=title|description` deep link from the detail-page callout pills. */
  searchParams: Promise<{ topic?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const chunk = await getChunkBySlug(slug);
  const t = await getTranslations({ locale, namespace: 'chunks.editRequests' });

  if (!chunk) {
    return { title: resolveTitle('Not Found', locale) };
  }

  const title = t('pageTitle', { name: chunk.title });
  return {
    ...generateCanonicalMetadata({ locale, path: `chunks/${slug}/edit-requests`, title }),
    title: resolveTitle(title, locale),
  };
}

export default async function ChunkEditRequestsPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { topic } = await searchParams;
  const focusTopic = isChunkFeedbackTopic(topic) ? topic : undefined;
  const chunk = await getChunkBySlug(slug);

  if (!chunk) {
    notFound();
  }

  const status = isChunkStatus(chunk.status) ? chunk.status : 'published';
  if (status !== 'draft') {
    notFound();
  }

  const [user, t, tChunks] = await Promise.all([
    getOptionalUser(),
    getTranslations({ locale, namespace: 'chunks.editRequests' }),
    getTranslations({ locale, namespace: 'chunks' }),
  ]);

  const viewerPendingRequestId = await getViewerPendingEditRequestForChunk(
    chunk.id,
    user?.id ?? null
  );

  return (
    <PageLayout
      title={t('pageTitle', { name: chunk.title })}
      locale={locale}
      breadcrumb={[
        { label: tChunks('listTitle'), href: '/chunks' },
        { label: chunk.title, href: `/chunks/${slug}` },
        { label: t('breadcrumb') },
      ]}
    >
      {/*
       * "Tentative current values" panel — anchors the diff for every
       * proposal below and gives the proposer a clear baseline before
       * the form prefills the same values. Marked as a read-only
       * snapshot rather than an editable card so it does not compete
       * with the actual edit affordance on `/chunks/[slug]/edit`.
       */}
      <section className="rounded-md border border-border bg-card p-4 space-y-3">
        <SectionTitle>{t('currentValuesTitle')}</SectionTitle>
        <p className="text-xs text-muted-foreground">{t('currentValuesHint')}</p>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{t('diff.titleLabel')}</dt>
          <dd className="font-medium text-foreground whitespace-pre-wrap break-words">
            {chunk.title}
          </dd>
          <dt className="text-muted-foreground">{t('diff.descriptionLabel')}</dt>
          <dd className="text-foreground whitespace-pre-wrap break-words">
            {chunk.description ?? <span className="text-muted-foreground">—</span>}
          </dd>
        </dl>
      </section>

      <EditRequestSection
        chunkId={chunk.id}
        chunkSlug={chunk.slug}
        chunkStatus={status}
        currentTitle={chunk.title}
        currentDescription={chunk.description}
        viewerId={user?.id ?? null}
        ownerId={chunk.userId}
        viewerHasPending={viewerPendingRequestId !== null}
        focusTopic={focusTopic}
        locale={locale}
      />
    </PageLayout>
  );
}
