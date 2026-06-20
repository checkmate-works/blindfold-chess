'use client';

import { useEffect, useMemo, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { ChunkOption } from '@/lib/chunks/types';
import type { GameChunkItem } from '@/lib/db/game-chunks';

import { addGameChunkAction, deleteGameChunkAction } from '../_actions/game-chunks';

type Params = {
  gameId: string;
  /** Move the links are anchored to (0-based ply). */
  currentPly: number;
  /** All chunk links for the game (every move); filtered to `currentPly` here. */
  chunks: GameChunkItem[];
  /** Signed-in viewer id — enables linking + removing one's own links. */
  currentUserId?: string;
  /** Whether the viewer is the game's registered owner (may remove any link). */
  isGameOwner: boolean;
};

/**
 * Optimistic state + mutation handlers for the per-move chunk links. Holds
 * every link for the game (filtered to `currentPly`), a per-move staging list
 * (search-select then submit), and the link / unlink actions. Extracted from
 * the former `GameChunkSection` so the list and the picker can be placed in
 * separate regions by `GameMoveContributions`.
 */
export function useGameChunkLinks({
  gameId,
  currentPly,
  chunks: initialChunks,
  currentUserId,
  isGameOwner,
}: Params) {
  const t = useTranslations('sharedGames.chunks');
  const [chunks, setChunks] = useState(initialChunks);
  const [staged, setStaged] = useState<ChunkOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Staging is per-move; discard it when the board moves to a different ply.
  useEffect(() => {
    setStaged([]);
    setError(null);
  }, [currentPly]);

  const forPly = useMemo(() => chunks.filter((c) => c.ply === currentPly), [chunks, currentPly]);
  const excludedChunkIds = useMemo(
    () => new Set([...forPly.map((c) => c.chunkId), ...staged.map((c) => c.id)]),
    [forPly, staged]
  );

  const canRemove = (item: GameChunkItem) =>
    isGameOwner || (currentUserId !== undefined && item.suggestedById === currentUserId);

  const localizeError = (code: string): string => {
    if (code === 'already_linked') return t('errors.alreadyLinked');
    if (code === 'chunk_not_available') return t('errors.chunkNotAvailable');
    if (code === 'rateLimited') return t('errors.rateLimited');
    return t('errors.generic');
  };

  async function handleSubmit() {
    if (staged.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    const results = await Promise.all(
      staged.map((chunk) =>
        addGameChunkAction({ gameId, ply: currentPly, chunkId: chunk.id }).then((res) => ({
          chunk,
          res,
        }))
      )
    );
    setSubmitting(false);

    const linked: GameChunkItem[] = [];
    const stillStaged: ChunkOption[] = [];
    let firstError: string | null = null;
    for (const { chunk, res } of results) {
      if (res.success) {
        linked.push({
          id: res.id,
          ply: currentPly,
          chunkId: chunk.id,
          slug: chunk.slug,
          title: chunk.label,
          description: chunk.description,
          representativeFen: chunk.representativeFen,
          createdAt: new Date(res.createdAt),
          suggestedById: currentUserId ?? null,
          suggester: null,
        });
      } else {
        stillStaged.push(chunk);
        firstError ??= localizeError(res.error);
      }
    }
    if (linked.length > 0) setChunks((prev) => [...prev, ...linked]);
    setStaged(stillStaged);
    if (firstError) setError(firstError);
  }

  async function handleRemoveSaved(id: string) {
    setError(null);
    const res = await deleteGameChunkAction(id);
    if (!res.success) {
      setError(localizeError(res.error));
      return;
    }
    setChunks((prev) => prev.filter((c) => c.id !== id));
  }

  const stage = (chunk: ChunkOption) => setStaged((prev) => [...prev, chunk]);
  const unstage = (id: string) => setStaged((prev) => prev.filter((s) => s.id !== id));

  return {
    forPly,
    staged,
    excludedChunkIds,
    submitting,
    error,
    canRemove,
    handleSubmit,
    handleRemoveSaved,
    stage,
    unstage,
  };
}
