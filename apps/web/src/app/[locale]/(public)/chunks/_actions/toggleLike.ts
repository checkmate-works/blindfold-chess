'use server';

import type { ToggleChunkLikeResult } from '@/lib/chunks/like-actions';
import { toggleChunkLikeBase } from '@/lib/chunks/like-actions';

/**
 * Toggle a like on a chunk row itself (not a comment within its
 * discussion thread — that lives at
 * `(public)/chunks/[slug]/_actions/toggleChunkLike.ts`).
 *
 * Signature is shape-compatible with `PostFooter`'s `toggleLikeAction`
 * type, which calls `(postId, locale, topicKey)`. The third positional
 * `_topicKey` is accepted for that interface but unused here — the
 * underlying entity is keyed by `chunkId` alone.
 */
export async function toggleLike(
  chunkId: string,
  locale: string,
  _topicKey: string
): Promise<ToggleChunkLikeResult> {
  return toggleChunkLikeBase(chunkId, locale);
}
