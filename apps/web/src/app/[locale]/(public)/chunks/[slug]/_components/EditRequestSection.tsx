import { getTranslations } from 'next-intl/server';

import { listEditRequestsForChunk } from '@/lib/chunk-edit-requests/queries';
import { getFeedbackTopicsForChunk } from '@/lib/chunks/queries';
import type { ChunkFeedbackTopic, ChunkStatus } from '@/lib/chunks/validation';
import type { EditRequestStatus } from '@/lib/edit-requests/shared';
import { isEditRequestStatus } from '@/lib/edit-requests/shared';

import { SectionTitle } from '@/app/[locale]/_components';

import { EditRequestForm } from './EditRequestForm';
import { EditRequestItem } from './EditRequestItem';

type Props = {
  chunkId: string;
  /** Threaded down to EditRequestForm for the post-submit redirect URL. */
  chunkSlug: string;
  chunkStatus: ChunkStatus;
  currentTitle: string;
  currentDescription: string | null;
  /** Authenticated viewer's id; null when signed out. */
  viewerId: string | null;
  /** Chunk owner's id; null for orphaned chunks (author hard-deleted). */
  ownerId: string | null;
  /**
   * Whether the viewer already has a pending edit request for this
   * chunk. Drives the "form vs. withdraw-and-resubmit notice" choice
   * — one pending per (chunk, proposer) is enforced at the mutation
   * layer, so showing a second submission form here would just lead
   * to an `alreadyHasPending` round-trip.
   */
  viewerHasPending: boolean;
  /**
   * Field to focus on load, from the `?topic=` deep link on the detail
   * page's callout pills. Forwarded to the form; ignored by the review
   * list.
   */
  focusTopic?: ChunkFeedbackTopic;
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
  chunkSlug,
  chunkStatus,
  currentTitle,
  currentDescription,
  viewerId,
  ownerId,
  viewerHasPending,
  focusTopic,
  locale,
}: Props) {
  if (chunkStatus !== 'draft') return null;

  const [rows, requestedFeedbackTopics, t] = await Promise.all([
    listEditRequestsForChunk(chunkId),
    getFeedbackTopicsForChunk(chunkId),
    getTranslations({ locale, namespace: 'chunks.editRequests' }),
  ]);

  const viewerIsOwner = !!viewerId && !!ownerId && viewerId === ownerId;
  const viewerIsSignedIn = !!viewerId;
  const viewerCanPropose = viewerIsSignedIn && !viewerIsOwner;

  const pendingCount = rows.filter((row) => row.request.status === 'pending').length;

  return (
    /*
     * Boxed to mirror the "Current values" panel above — both read as
     * peer cards on the page. The explanatory "other players can
     * suggest…" hint that used to sit here moved to the HelpTourButton
     * beside the page title (`data-tour-id` below is its spotlight
     * target), so the box opens straight on its heading with no
     * structural gap between the two cards.
     */
    <section
      data-tour-id="chunk-edit-suggestions"
      className="rounded-md border border-border bg-card p-4 space-y-4"
    >
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

      {viewerCanPropose ? (
        viewerHasPending ? (
          /*
           * The viewer already has a pending row in the list below;
           * one-pending-per-(chunk, proposer) is an application-layer
           * invariant, so the form is hidden and we point them at the
           * Withdraw button on their existing row instead. This keeps
           * a fresh proposal one-click away (after withdraw) without
           * letting the page round-trip to `alreadyHasPending`.
           */
          <div
            className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100"
            role="status"
          >
            {t('alreadyHasPendingNotice')}
          </div>
        ) : (
          <EditRequestForm
            chunkId={chunkId}
            chunkSlug={chunkSlug}
            currentTitle={currentTitle}
            currentDescription={currentDescription}
            requestedFeedbackTopics={requestedFeedbackTopics}
            wantedLabel={t('formWantedLabel')}
            focusTopic={focusTopic}
          />
        )
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
            const status: EditRequestStatus = isEditRequestStatus(request.status)
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
