import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlus } from 'react-icons/fa';

import { getChunkOptionsByIds } from '@/lib/chunks/queries';
import type { EditRequestStatus } from '@/lib/edit-requests/shared';
import { isEditRequestStatus } from '@/lib/edit-requests/shared';
import {
  getViewerPendingEditRequestForPosition,
  listEditRequestsForPosition,
} from '@/lib/position-edit-requests/queries';
import { loadAvailableTags, loadPositionTags } from '@/lib/positions/tag-loader';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionEditRequestItem } from './PositionEditRequestItem';
import { TagDiffCard } from './TagDiffCard';
import type { TagDiffEntry } from './TagDiffCard';

type Props = {
  positionId: string;
  /** Detail-page path (no locale prefix), e.g. `/practice/puzzle/<id>`. The
   * accept / reject flow redirects here with a `?toast=` confirmation. */
  detailHref: string;
  /** Path to the dedicated submission-form page, e.g.
   * `/practice/puzzle/<id>/suggestions/new`. Surfaced as a CTA button for
   * eligible viewers instead of an inline form. */
  newSuggestionHref: string;
  /** Authenticated viewer's id; null when signed out. */
  viewerId: string | null;
  /** Position owner's id (positions.user_id is NOT NULL). */
  ownerId: string | null;
  locale: Locale;
};

/**
 * Server-rendered "Tag suggestions" review-list panel on a position detail
 * page (memory / puzzle). Surfaces the suggestion queue, plus a CTA into the
 * dedicated submission-form page for eligible non-owners, with role-aware
 * controls threaded down to each client `PositionEditRequestItem`. Always
 * rendered for non-deleted positions (positions have no draft / published
 * lifecycle).
 *
 * Proposals are additive, so each row renders a single "will add" list
 * rather than an added / removed diff. A pending row is compared against
 * the position's *live* tag set, so the owner always sees the true effect
 * of accepting right now; a resolved row is compared against the snapshot
 * captured at resolution time, so the history keeps showing what that
 * resolution actually added.
 */
export async function PositionEditRequestSection({
  positionId,
  detailHref,
  newSuggestionHref,
  viewerId,
  ownerId,
  locale,
}: Props) {
  const [rows, current, available, t, tTags] = await Promise.all([
    listEditRequestsForPosition(positionId),
    loadPositionTags(positionId, locale),
    loadAvailableTags(locale),
    getTranslations({ locale, namespace: 'practice.positionEditRequests' }),
    getTranslations({ locale, namespace: 'practice.tags' }),
  ]);
  const badgeLabels = { theme: tTags('badge.theme'), chunk: tTags('badge.chunk') };

  const viewerIsOwner = !!viewerId && viewerId === ownerId;
  const viewerIsSignedIn = !!viewerId;
  const viewerCanPropose = viewerIsSignedIn && !viewerIsOwner;

  const viewerHasPending =
    viewerCanPropose && !!(await getViewerPendingEditRequestForPosition(positionId, viewerId));

  // Theme catalog is bounded master data and `loadAvailableTags` returns all
  // of it, so themes need no id-backfill query: anything a proposal
  // references but the catalog lacks has since lost `is_theme` and renders
  // via the fallback label below.
  const themeMap = new Map<string, TagDiffEntry>();
  for (const theme of [...available.themes, ...current.themes]) {
    themeMap.set(theme.id, {
      kind: 'theme',
      id: theme.id,
      slug: theme.slug,
      label: theme.label,
      previewFen: theme.previewFen,
      description: theme.definition,
    });
  }

  // Chunks do need a backfill: the catalog is published-only, so a proposal
  // may reference a chunk that has since been unpublished or soft-deleted.
  const chunkMap = new Map<string, TagDiffEntry>();
  const addChunk = (chunk: {
    id: string;
    slug: string;
    label: string;
    representativeFen: string;
    description: string | null;
  }) =>
    chunkMap.set(chunk.id, {
      kind: 'chunk',
      id: chunk.id,
      slug: chunk.slug,
      label: chunk.label,
      previewFen: chunk.representativeFen,
      description: chunk.description,
    });
  for (const chunk of [...available.chunks, ...current.chunks]) {
    addChunk(chunk);
  }
  const missingChunkIds = new Set<string>();
  for (const { request } of rows) {
    for (const id of [...request.proposedChunkIds, ...(request.resolvedBaseChunkIds ?? [])]) {
      if (!chunkMap.has(id)) missingChunkIds.add(id);
    }
  }
  if (missingChunkIds.size > 0) {
    for (const [, chunk] of await getChunkOptionsByIds([...missingChunkIds])) {
      addChunk(chunk);
    }
  }

  function resolveTags(kind: 'theme' | 'chunk', ids: string[]): TagDiffEntry[] {
    const map = kind === 'theme' ? themeMap : chunkMap;
    const fallbackLabel = kind === 'theme' ? t('deletedTheme') : t('deletedChunk');
    return ids.map(
      (id) =>
        map.get(id) ?? {
          kind,
          id,
          slug: null,
          label: fallbackLabel,
          previewFen: null,
          description: null,
        }
    );
  }

  /**
   * Render one request's "will add" list. Themes lead, then chunks —
   * the same order the position detail page's `RelatedTags` uses. An empty
   * list means every proposed tag is already linked (the owner attached it
   * in the meantime, or the row predates the additive model).
   */
  function renderAdded(entries: TagDiffEntry[]): ReactNode {
    if (entries.length === 0) {
      return <p className="text-sm text-muted-foreground">{t('diff.nothingToAdd')}</p>;
    }
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {t('diff.tagsToAdd')}
        </p>
        <div className="space-y-2">
          {entries.map((entry) => (
            <TagDiffCard
              key={`${entry.kind}-${entry.id}`}
              entry={entry}
              badgeLabel={badgeLabels[entry.kind]}
              locale={locale}
            />
          ))}
        </div>
      </div>
    );
  }

  const currentThemeIds = new Set(current.themes.map((theme) => theme.id));
  const currentChunkIds = new Set(current.chunks.map((chunk) => chunk.id));
  const pendingCount = rows.filter((row) => row.request.status === 'pending').length;

  return (
    <section className="space-y-4">
      {/* `data-tour-id` anchors the page-title HelpTourButton step, which
          explains the suggest-a-tag concept (see PositionEditRequestsView). */}
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

      {/* Status about a row further down ("still pending below"), not an
          action — so it stays above the queue while the CTA moves under it. */}
      {viewerCanPropose && viewerHasPending && (
        <div
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100"
          role="status"
        >
          {t('alreadyHasPendingNotice')}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-center pt-8 pb-2">{t('empty')}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ request, proposer }) => {
            const status: EditRequestStatus = isEditRequestStatus(request.status)
              ? request.status
              : 'pending';
            // Pending rows compare against the live tag set (true "accept
            // now" effect for the reviewing owner). Resolved rows compare
            // against the snapshot captured at resolution time, so the
            // history shows what the resolution actually added. Rows
            // resolved before a given snapshot column existed fall back to
            // the live set.
            const isResolved = status !== 'pending';
            const baseThemeIds =
              isResolved && request.resolvedBaseThemeIds
                ? new Set(request.resolvedBaseThemeIds)
                : currentThemeIds;
            const baseChunkIds =
              isResolved && request.resolvedBaseChunkIds
                ? new Set(request.resolvedBaseChunkIds)
                : currentChunkIds;
            const added = [
              ...resolveTags(
                'theme',
                request.proposedThemeIds.filter((id) => !baseThemeIds.has(id))
              ),
              ...resolveTags(
                'chunk',
                request.proposedChunkIds.filter((id) => !baseChunkIds.has(id))
              ),
            ];
            return (
              <li key={request.id}>
                <PositionEditRequestItem
                  requestId={request.id}
                  status={status}
                  createdAt={request.createdAt}
                  proposer={proposer ?? null}
                  proposerId={request.proposerId}
                  detailHref={detailHref}
                  diff={renderAdded(added)}
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

      {/* The propose action trails the queue, so a visitor reads what has
          already been suggested before adding their own (fewer duplicates)
          and the empty state reads as "nothing yet → be the first". */}
      {viewerCanPropose
        ? !viewerHasPending && (
            <Link
              href={newSuggestionHref as '/practice/position-memory/[id]/suggestions/new'}
              locale={locale}
            >
              <Button asChild variant="primary" size="lg" icon={<FaPlus />} fullWidth>
                {t('suggestCta')}
              </Button>
            </Link>
          )
        : !viewerIsOwner && (
            <p className="text-muted-foreground text-center">{t('signInToSuggest')}</p>
          )}
    </section>
  );
}
