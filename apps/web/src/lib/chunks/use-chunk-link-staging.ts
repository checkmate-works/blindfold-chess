'use client';

import { useState } from 'react';

import type { ChunkLinkCardItem, ChunkOption } from '@/lib/chunks/types';

type AddResult =
  { success: true; id: string; createdAt: string } | { success: false; error: string };
type DeleteResult = { success: true } | { success: false; error: string };

type Params<T extends ChunkLinkCardItem> = {
  /** Links already saved for this anchor, as the initial optimistic state. */
  items: T[];
  /** Signed-in viewer's id, or undefined. Only their own links are removable. */
  currentUserId: string | undefined;
  /** True for the owner of the thing being annotated — may remove any link. */
  canRemoveAny: boolean;
  /** Links one staged chunk to the caller's anchor. */
  addAction: (chunk: ChunkOption) => Promise<AddResult>;
  /** Builds the optimistic row for a chunk the server accepted. */
  buildItem: (chunk: ChunkOption, accepted: { id: string; createdAt: string }) => T;
  deleteAction: (id: string) => Promise<DeleteResult>;
  /** Turns a server error code into a message for this surface. */
  localizeError: (code: string) => string;
};

/**
 * Staging list and optimistic mutations for chunk links: pick several chunks,
 * submit them together, keep the ones that failed staged with the first error
 * shown, and remove a saved one.
 *
 * Two surfaces link chunks to a position — a shared game's move and a
 * repertoire line's position — and their hooks were the same 152 lines with
 * the type names swapped, down to the comments. Each declared in its TSDoc
 * that it mirrored the other, which is a maintenance contract no tool checks.
 *
 * The partial-failure handling is the part worth having once: a submission is
 * N independent server calls, and the rule is that successes are appended,
 * failures stay staged so the user can retry them, and only the first error is
 * surfaced. Getting that subtly different on one of two screens is invisible
 * until someone hits a partial failure.
 *
 * What stays with the caller is what actually differs: the game screen holds
 * every link for the game and filters to the current ply, while the repertoire
 * screen is handed one position's links and remounts on a key when the board
 * moves. So `excludedChunkIds` — which depends on what is *visible* — is
 * computed at the call site from the returned `items` and `staged`.
 */
export function useChunkLinkStaging<T extends ChunkLinkCardItem>({
  items: initialItems,
  currentUserId,
  canRemoveAny,
  addAction,
  buildItem,
  deleteAction,
  localizeError,
}: Params<T>) {
  const [items, setItems] = useState(initialItems);
  const [staged, setStaged] = useState<ChunkOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRemove = (item: T) =>
    canRemoveAny || (currentUserId !== undefined && item.suggestedById === currentUserId);

  async function handleSubmit() {
    if (staged.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    const results = await Promise.all(
      staged.map((chunk) => addAction(chunk).then((res) => ({ chunk, res })))
    );
    setSubmitting(false);

    const linked: T[] = [];
    const stillStaged: ChunkOption[] = [];
    let firstError: string | null = null;
    for (const { chunk, res } of results) {
      if (res.success) {
        linked.push(buildItem(chunk, res));
      } else {
        stillStaged.push(chunk);
        firstError ??= localizeError(res.error);
      }
    }
    if (linked.length > 0) setItems((prev) => [...prev, ...linked]);
    setStaged(stillStaged);
    if (firstError) setError(firstError);
  }

  /**
   * Returns a localized error rather than setting the shared `error`, which
   * belongs to the staging area — the caller's confirmation modal shows the
   * loading and failure states for a removal inline.
   */
  async function handleRemoveSaved(id: string): Promise<{ error?: string }> {
    const res = await deleteAction(id);
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
    setItems,
    staged,
    submitting,
    error,
    setStaged,
    setError,
    canRemove,
    handleSubmit,
    handleRemoveSaved,
    stage,
    unstage,
  };
}
