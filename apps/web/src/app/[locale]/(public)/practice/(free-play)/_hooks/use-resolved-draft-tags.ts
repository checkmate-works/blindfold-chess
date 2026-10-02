'use client';

import { useMemo } from 'react';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { resolveOptionsByIds } from '../_lib/resolve-options';

/** The tag fields every authoring draft persists: option IDs, not objects. */
type TaggedDraft = {
  themeIds?: string[];
  chunkIds?: string[];
};

/**
 * Resolve a draft's persisted theme/chunk IDs into the full option objects a
 * read-only preview lists. The draft is `null` until hydrated from
 * sessionStorage, which resolves to empty lists rather than a branch in the
 * caller.
 *
 * Each list is memoised on its own ID array so a catalog or ID change on one
 * side does not rebuild the other — the three preview screens (puzzle create,
 * puzzle edit, position-memory create) all wrote this pair of `useMemo`s by
 * hand before it lived here.
 */
export function useResolvedDraftTags(
  draft: TaggedDraft | null,
  availableThemes: ThemeOption[],
  availableChunks: ChunkOption[]
): { selectedThemes: ThemeOption[]; selectedChunks: ChunkOption[] } {
  const themeIds = draft?.themeIds;
  const chunkIds = draft?.chunkIds;

  const selectedThemes = useMemo(
    () => resolveOptionsByIds(themeIds ?? [], availableThemes),
    [themeIds, availableThemes]
  );
  const selectedChunks = useMemo(
    () => resolveOptionsByIds(chunkIds ?? [], availableChunks),
    [chunkIds, availableChunks]
  );

  return { selectedThemes, selectedChunks };
}
