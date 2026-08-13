'use client';

import { useEffect, useMemo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { ChunkOption } from '@/lib/chunks/types';
import { useChunkLinkStaging } from '@/lib/chunks/use-chunk-link-staging';
import type { GameChunkItem } from '@/lib/db/game-chunks';

import { addGameChunkAction, deleteGameChunkAction } from '../_actions/game-chunks';
import type { CommentUser } from '../_components/GameCommentContext';

async function noop() {}

type Params = {
  gameId: string;
  /**
   * Move the links are anchored to (0-based ply). Null on the whole-game
   * thread, where chunk linking is unavailable (`game_chunks.ply` is NOT
   * NULL; issue #103 tracks the start-position relaxation) — the consumer
   * hides the chunk UI there, and this hook just matches nothing.
   */
  currentPly: number | null;
  /** All chunk links for the game (every move); filtered to `currentPly` here. */
  chunks: GameChunkItem[];
  /** Signed-in viewer — enables linking, removing one's own links, and seeds
   * the optimistic suggester profile so a fresh link renders like a comment. */
  currentUser: CommentUser | null;
  /** Whether the viewer is the game's registered owner (may remove any link). */
  isGameOwner: boolean;
};

/**
 * Per-move chunk links for a shared game. The staging list and its optimistic
 * mutations live in {@link useChunkLinkStaging}; what is specific here is that
 * this hook holds every link for the game and narrows to `currentPly`, so the
 * exclusion set and the staging reset are keyed on the move.
 */
export function useGameChunkLinks({
  gameId,
  currentPly,
  chunks,
  currentUser,
  isGameOwner,
}: Params) {
  const t = useTranslations('sharedGames.chunks');

  const localizeError = (code: string): string => {
    if (code === 'already_linked') return t('errors.alreadyLinked');
    if (code === 'chunk_not_available') return t('errors.chunkNotAvailable');
    if (code === 'rateLimited') return t('errors.rateLimited');
    return t('errors.generic');
  };

  const staging = useChunkLinkStaging<GameChunkItem>({
    items: chunks,
    currentUserId: currentUser?.id,
    canRemoveAny: isGameOwner,
    // Unreachable while `currentPly` is null — `handleSubmit` below is a
    // no-op there — but expressed rather than asserted, so a future caller
    // that submits without a move gets a rejection instead of a crash.
    addAction: (chunk: ChunkOption) =>
      currentPly === null
        ? Promise.resolve({ success: false as const, error: 'invalid_input' })
        : addGameChunkAction({ gameId, ply: currentPly, chunkId: chunk.id }),
    buildItem: (chunk, accepted) => ({
      id: accepted.id,
      // Only reached via a successful add, which requires a non-null ply.
      ply: currentPly ?? 0,
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
    deleteAction: deleteGameChunkAction,
    localizeError,
  });

  const { items, staged, setStaged, setError } = staging;

  // Staging is per-move; discard it when the board moves to a different ply.
  useEffect(() => {
    setStaged([]);
    setError(null);
  }, [currentPly, setStaged, setError]);

  const forPly = useMemo(() => items.filter((c) => c.ply === currentPly), [items, currentPly]);
  const excludedChunkIds = useMemo(
    () => new Set([...forPly.map((c) => c.chunkId), ...staged.map((c) => c.id)]),
    [forPly, staged]
  );

  return {
    forPly,
    staged,
    excludedChunkIds,
    submitting: staging.submitting,
    error: staging.error,
    canRemove: staging.canRemove,
    // Linking is unavailable on the whole-game thread (no ply to anchor to);
    // the consumer hides the UI there and this keeps submit inert regardless.
    handleSubmit: currentPly === null ? noop : staging.handleSubmit,
    handleRemoveSaved: staging.handleRemoveSaved,
    stage: staging.stage,
    unstage: staging.unstage,
  };
}
