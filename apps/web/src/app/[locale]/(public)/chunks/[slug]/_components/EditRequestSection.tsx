import { getTranslations } from 'next-intl/server';

import { listEditRequestsForChunk } from '@/lib/chunk-edit-requests/queries';
import { isChunkEditRequestStatus } from '@/lib/chunk-edit-requests/validation';
import type { ChunkEditRequestStatus } from '@/lib/chunk-edit-requests/validation';
import type { ChunkStatus } from '@/lib/chunks/validation';

import { SectionTitle } from '@/app/[locale]/_components';

import { EditRequestForm } from './EditRequestForm';
import { EditRequestItem } from './EditRequestItem';

type Props = {
  chunkId: string;
  chunkStatus: ChunkStatus;
  currentTitle: string;
  currentDescription: string | null;
  /** Authenticated viewer's id; null when signed out. */
  viewerId: string | null;
  /** Chunk owner's id; null for orphaned chunks (author hard-deleted). */
  ownerId: string | null;
  locale: string;
};

/**
 * Server-rendered "Edit suggestions" panel on the chunk detail page.
 * Surfaces the open suggestions queue + form, with role-aware controls
 * threaded down to each client `EditRequestItem`. Hidden entirely for
 * published chunks since no new suggestions are accepted there and the
 * resolved history would just be noise (this can be relaxed later if
 * we want to keep the audit trail visible).
 */
export async function EditRequestSection({
  chunkId,
  chunkStatus,
  currentTitle,
  currentDescription,
  viewerId,
  ownerId,
  locale,
}: Props) {
  if (chunkStatus !== 'draft') return null;

  const [rows, t] = await Promise.all([
    listEditRequestsForChunk(chunkId),
    getTranslations({ locale, namespace: 'chunks.editRequests' }),
  ]);

  const viewerIsOwner = !!viewerId && !!ownerId && viewerId === ownerId;
  const viewerIsSignedIn = !!viewerId;
  const viewerCanPropose = viewerIsSignedIn && !viewerIsOwner;

  const pendingCount = rows.filter((row) => row.request.status === 'pending').length;

  return (
    <section className="space-y-4">
      {/*
       * The pending-count badge lives INSIDE the SectionTitle children so
       * the h2 stays block-level — its `border-b` then spans the panel
       * width, matching every other section heading in the app. Wrapping
       * SectionTitle in an outer flex (the previous shape) shrank the h2
       * to content width and left a stray short underline.
       */}
      <SectionTitle>
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span>{t('sectionTitle')}</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
              {t('pendingCount', { count: pendingCount })}
            </span>
          )}
        </span>
      </SectionTitle>

      <p className="text-sm text-muted-foreground">{t('sectionHint')}</p>

      {viewerCanPropose ? (
        <EditRequestForm
          chunkId={chunkId}
          currentTitle={currentTitle}
          currentDescription={currentDescription}
        />
      ) : (
        !viewerIsOwner && <p className="text-sm text-muted-foreground">{t('signInToSuggest')}</p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ request, proposer }) => {
            // Defensive: the DB column is varchar so an unknown value (e.g.
            // a future status shipped before this page redeployed) degrades
            // safely to 'pending' for badge / control purposes.
            const status: ChunkEditRequestStatus = isChunkEditRequestStatus(request.status)
              ? request.status
              : 'pending';
            return (
              <li key={request.id}>
                <EditRequestItem
                  requestId={request.id}
                  status={status}
                  createdAt={request.createdAt}
                  proposer={proposer ?? null}
                  proposerId={request.proposerId}
                  proposedTitle={request.proposedTitle}
                  proposedDescription={request.proposedDescription}
                  currentTitle={currentTitle}
                  currentDescription={currentDescription}
                  comment={request.comment}
                  resolverComment={request.resolverComment}
                  viewerIsOwner={viewerIsOwner}
                  viewerIsProposer={!!viewerId && request.proposerId === viewerId}
                  locale={locale}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
