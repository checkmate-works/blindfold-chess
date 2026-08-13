'use client';

import { useMemo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { ChunkOption } from '@/lib/chunks/types';
import { useChunkLinkStaging } from '@/lib/chunks/use-chunk-link-staging';
import type { RepertoireChunkItem } from '@/lib/db/repertoire-chunks';
import type { IdentifiedAuthorProfile } from '@/lib/users/author-profile';

import {
  addRepertoireChunkAction,
  deleteRepertoireChunkAction,
} from '../_actions/repertoire-chunks';

export type LineChunksUser = IdentifiedAuthorProfile;

type Params = {
  repertoireId: string;
  lineNo: number;
  /** 1-based half-move the picker links against (the page's `initialPly`). */
  ply: number;
  /** The current position's chunk links only — the page has already grouped
   * `listRepertoireChunks` by `positionKey` and picked this position's bucket. */
  items: RepertoireChunkItem[];
  /** Signed-in viewer — enables linking, removing one's own links, and seeds
   * the optimistic suggester profile so a fresh link renders like a comment. */
  currentUser: LineChunksUser | null;
  /** Whether the viewer owns the repertoire (may remove any link). */
  isOwner: boolean;
};

/**
 * Chunk links for one repertoire position. The staging list and its optimistic
 * mutations live in {@link useChunkLinkStaging}; this hook is handed a single
 * position's links, and the owning component is keyed on `positionKey` (see
 * `LineChunksSection`'s call site), so a full remount — not an effect — resets
 * staging when the board moves.
 */
export function useRepertoireChunkLinks({
  repertoireId,
  lineNo,
  ply,
  items: initialItems,
  currentUser,
  isOwner,
}: Params) {
  const t = useTranslations('Repertoires.chunks');

  const localizeError = (code: string): string => {
    if (code === 'already_linked') return t('errors.alreadyLinked');
    if (code === 'chunk_not_available') return t('errors.chunkNotAvailable');
    if (code === 'rateLimited') return t('errors.rateLimited');
    return t('errors.generic');
  };

  const staging = useChunkLinkStaging<RepertoireChunkItem>({
    items: initialItems,
    currentUserId: currentUser?.id,
    canRemoveAny: isOwner,
    addAction: (chunk: ChunkOption) =>
      addRepertoireChunkAction({ repertoireId, lineNo, ply, chunkId: chunk.id }),
    buildItem: (chunk, accepted) => ({
      id: accepted.id,
      // Never read by the display — the page already scoped `items` to
      // one position, so nothing here needs to know which one.
      positionKey: '',
      chunkId: chunk.id,
      slug: chunk.slug,
      title: chunk.label,
      description: chunk.description,
      representativeFen: chunk.representativeFen,
      status: chunk.status,
      createdAt: new Date(accepted.createdAt),
      suggestedById: currentUser?.id ?? null,
      // Seed the suggester from the viewer so the freshly-linked card shows
      // the same avatar / name as it will after a reload.
      suggester: currentUser
        ? {
            username: currentUser.username,
            displayName: currentUser.displayName,
            avatarUrl: currentUser.avatarUrl,
          }
        : null,
    }),
    deleteAction: deleteRepertoireChunkAction,
    localizeError,
  });

  const { items, staged } = staging;
  const excludedChunkIds = useMemo(
    () => new Set([...items.map((c) => c.chunkId), ...staged.map((c) => c.id)]),
    [items, staged]
  );

  return {
    items,
    staged,
    excludedChunkIds,
    submitting: staging.submitting,
    error: staging.error,
    canRemove: staging.canRemove,
    handleSubmit: staging.handleSubmit,
    handleRemoveSaved: staging.handleRemoveSaved,
    stage: staging.stage,
    unstage: staging.unstage,
  };
}
