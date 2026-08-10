'use client';

import { useMemo, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { ChunkOption } from '@/lib/chunks/types';
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
 * Optimistic state + mutation handlers for a single position's chunk links.
 * Mirrors `useGameChunkLinks`, minus the per-move filtering / reset-on-ply
 * effect: the game hook holds links for the WHOLE game and filters to the
 * current ply client-side, whereas here the caller passes only the current
 * position's links (already grouped server-side by `positionKey`), and the
 * owning component is keyed on `positionKey` (see `LineChunksSection`'s call
 * site) — a full remount, not an effect, resets staging when the board moves
 * to a different position.
 */
export function useRepertoireChunkLinks({
  repertoireId,
  lineNo,
  ply,
  items: initialItems,
  currentUser,
  isOwner,
}: Params) {
  const currentUserId = currentUser?.id;
  const t = useTranslations('Repertoires.chunks');
  const [items, setItems] = useState(initialItems);
  const [staged, setStaged] = useState<ChunkOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const excludedChunkIds = useMemo(
    () => new Set([...items.map((c) => c.chunkId), ...staged.map((c) => c.id)]),
    [items, staged]
  );

  const canRemove = (item: RepertoireChunkItem) =>
    isOwner || (currentUserId !== undefined && item.suggestedById === currentUserId);

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
        addRepertoireChunkAction({ repertoireId, lineNo, ply, chunkId: chunk.id }).then((res) => ({
          chunk,
          res,
        }))
      )
    );
    setSubmitting(false);

    const linked: RepertoireChunkItem[] = [];
    const stillStaged: ChunkOption[] = [];
    let firstError: string | null = null;
    for (const { chunk, res } of results) {
      if (res.success) {
        linked.push({
          id: res.id,
          // Never read by the display — the page already scoped `items` to
          // one position, so nothing here needs to know which one.
          positionKey: '',
          chunkId: chunk.id,
          slug: chunk.slug,
          title: chunk.label,
          description: chunk.description,
          representativeFen: chunk.representativeFen,
          status: chunk.status,
          createdAt: new Date(res.createdAt),
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
        });
      } else {
        stillStaged.push(chunk);
        firstError ??= localizeError(res.error);
      }
    }
    if (linked.length > 0) setItems((prev) => [...prev, ...linked]);
    setStaged(stillStaged);
    if (firstError) setError(firstError);
  }

  // Returns a localized error (rather than setting the shared `error`, which is
  // for the staging area) so the caller's confirmation modal can show loading /
  // error inline — mirroring the move comment thread's `remove`.
  async function handleRemoveSaved(id: string): Promise<{ error?: string }> {
    const res = await deleteRepertoireChunkAction(id);
    if (!res.success) {
      return { error: localizeError(res.error) };
    }
    setItems((prev) => prev.filter((c) => c.id !== id));
    return {};
  }

  const stage = (chunk: ChunkOption) => setStaged((prev) => [...prev, chunk]);
  const unstage = (id: string) => setStaged((prev) => prev.filter((s) => s.id !== id));

  return {
    items,
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
