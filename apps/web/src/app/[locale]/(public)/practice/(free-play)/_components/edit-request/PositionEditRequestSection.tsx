import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import {
  getAllAvailableChunkOptions,
  getChunkOptionsByIds,
  getLinkedChunkOptionsForPosition,
} from '@/lib/chunks/queries';
import type { ChunkOption } from '@/lib/chunks/types';
import type { EditRequestStatus } from '@/lib/edit-requests/shared';
import { isEditRequestStatus } from '@/lib/edit-requests/shared';
import {
  getViewerPendingEditRequestForPosition,
  listEditRequestsForPosition,
} from '@/lib/position-edit-requests/queries';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ChunkDiffCard } from './ChunkDiffCard';
import type { ChunkDiffEntry } from './ChunkDiffCard';
import { PositionEditRequestForm } from './PositionEditRequestForm';
import { PositionEditRequestItem } from './PositionEditRequestItem';

type Props = {
  positionId: string;
  /** Detail-page path (no locale prefix), e.g. `/practice/puzzle/<id>`. The
   * accept / reject flow redirects here with a `?toast=` confirmation. */
  detailHref: string;
  /** Authenticated viewer's id; null when signed out. */
  viewerId: string | null;
  /** Position owner's id (positions.user_id is NOT NULL). */
  ownerId: string | null;
  locale: Locale;
};

/**
 * Server-rendered "Edit suggestions" panel on a position detail page
 * (memory / puzzle). Surfaces the chunk-link suggestion queue + form for
 * non-owners, with role-aware controls threaded down to each client
 * `PositionEditRequestItem`. Always rendered for non-deleted positions
 * (positions have no draft / published lifecycle).
 *
 * The added / removed diff for each request is computed here against the
 * position's *live* linked-chunk set, so the owner always sees the true
 * effect of accepting right now even if the links changed since the
 * proposal was submitted.
 */
export async function PositionEditRequestSection({
  positionId,
  detailHref,
  viewerId,
  ownerId,
  locale,
}: Props) {
  const [rows, currentChunks, availableChunks, t, tTags] = await Promise.all([
    listEditRequestsForPosition(positionId),
    getLinkedChunkOptionsForPosition(positionId),
    getAllAvailableChunkOptions(),
    getTranslations({ locale, namespace: 'practice.positionEditRequests' }),
    getTranslations({ locale, namespace: 'practice.tags' }),
  ]);
  const chunkBadgeLabel = tTags('badge.chunk');

  const viewerIsOwner = !!viewerId && viewerId === ownerId;
  const viewerIsSignedIn = !!viewerId;
  const viewerCanPropose = viewerIsSignedIn && !viewerIsOwner;

  const viewerHasPending =
    viewerCanPropose && !!(await getViewerPendingEditRequestForPosition(positionId, viewerId));

  // Build the chunk-id → label map from the catalog + the current links,
  // then backfill any proposal-referenced ids that aren't in either set
  // (e.g. a chunk that was unlinked or unpublished since the proposal).
  const labelMap = new Map<string, ChunkOption>();
  for (const chunk of [...availableChunks, ...currentChunks]) {
    labelMap.set(chunk.id, chunk);
  }
  const missingIds = new Set<string>();
  for (const { request } of rows) {
    for (const id of [...request.proposedChunkIds, ...(request.resolvedBaseChunkIds ?? [])]) {
      if (!labelMap.has(id)) missingIds.add(id);
    }
  }
  if (missingIds.size > 0) {
    const backfill = await getChunkOptionsByIds([...missingIds]);
    for (const [id, chunk] of backfill) {
      labelMap.set(id, chunk);
    }
  }

  function resolveDiff(ids: string[]): ChunkDiffEntry[] {
    return ids.map((id) => {
      const chunk = labelMap.get(id);
      return {
        id,
        slug: chunk?.slug ?? null,
        label: chunk?.label ?? t('deletedChunk'),
        representativeFen: chunk?.representativeFen ?? null,
        description: chunk?.description ?? null,
      };
    });
  }

  /**
   * Render the added / removed chunk diff for one request. Uses the
   * shared `ChunkDiffCard` (same visual as the position detail page's
   * `RelatedTags`). Both lists empty → a "no net change" note.
   */
  function renderDiff(added: ChunkDiffEntry[], removed: ChunkDiffEntry[]): ReactNode {
    if (added.length === 0 && removed.length === 0) {
      return <p className="text-sm text-muted-foreground">{t('diff.noChange')}</p>;
    }
    return (
      <div className="space-y-3">
        {added.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {t('diff.added')}
            </p>
            <div className="space-y-2">
              {added.map((entry) => (
                <ChunkDiffCard
                  key={entry.id}
                  entry={entry}
                  tone="added"
                  badgeLabel={chunkBadgeLabel}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        )}
        {removed.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-rose-700 dark:text-rose-400">
              {t('diff.removed')}
            </p>
            <div className="space-y-2">
              {removed.map((entry) => (
                <ChunkDiffCard
                  key={entry.id}
                  entry={entry}
                  tone="removed"
                  badgeLabel={chunkBadgeLabel}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentChunkIds = new Set(currentChunks.map((c) => c.id));
  const pendingCount = rows.filter((row) => row.request.status === 'pending').length;

  return (
    <section className="space-y-4">
      {/* `data-tour-id` anchors the page-title HelpTourButton step, which
          explains the suggest-a-chunk concept (see PositionEditRequestsView). */}
      <div data-tour-id="position-edit-requests-intro">
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
      </div>

      {viewerCanPropose ? (
        viewerHasPending ? (
          <div
            className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100"
            role="status"
          >
            {t('alreadyHasPendingNotice')}
          </div>
        ) : (
          <PositionEditRequestForm
            positionId={positionId}
            currentChunks={currentChunks}
            availableChunks={availableChunks}
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
            const status: EditRequestStatus = isEditRequestStatus(request.status)
              ? request.status
              : 'pending';
            // Pending rows diff against the live link set (true "accept now"
            // effect for the reviewing owner). Resolved rows diff against the
            // snapshot captured at resolution time, so the history shows what
            // the resolution actually changed. Legacy resolved rows without a
            // snapshot fall back to the live set.
            const baseIds =
              status !== 'pending' && request.resolvedBaseChunkIds
                ? new Set(request.resolvedBaseChunkIds)
                : currentChunkIds;
            const proposedSet = new Set(request.proposedChunkIds);
            const added = request.proposedChunkIds.filter((id) => !baseIds.has(id));
            const removed = [...baseIds].filter((id) => !proposedSet.has(id));
            return (
              <li key={request.id}>
                <PositionEditRequestItem
                  requestId={request.id}
                  status={status}
                  createdAt={request.createdAt}
                  proposer={proposer ?? null}
                  proposerId={request.proposerId}
                  detailHref={detailHref}
                  diff={renderDiff(resolveDiff(added), resolveDiff(removed))}
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
