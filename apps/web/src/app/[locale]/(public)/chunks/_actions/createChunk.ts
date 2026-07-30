'use server';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { CreateChunkResult } from '@/lib/chunks/user-chunk-mutations';
import { createChunkEntry } from '@/lib/chunks/user-chunk-mutations';
import type { ChunkFeedbackTopic, ChunkStatus } from '@/lib/chunks/validation';
import { parseFeedbackTopics } from '@/lib/chunks/validation';

import { isChunkLinkTarget } from '../_lib/link-target';

/**
 * Public-facing wrapper around `createChunkEntry`.
 *
 * `userId` is intentionally absent from the input — the underlying entry
 * function pulls the authenticated user from Supabase auth and overwrites
 * whatever the client supplied, so accepting it here would just create a
 * confusing spoof surface.
 *
 * `status` defaults to `'draft'` when omitted to push the UGC flow toward
 * the workshop state (where collaborative naming via edit suggestions
 * lands in a follow-up phase). The user can flip the form toggle to
 * publish immediately if they want.
 */
export async function createChunk(input: {
  representativeFen: string;
  title: string;
  slug: string;
  description?: string | null;
  annotations?: BoardAnnotations;
  status?: ChunkStatus;
  /**
   * Fields the author wants targeted feedback on. The mutation layer
   * persists rows to `chunk_feedback_topics` only when the resulting
   * status is `'draft'`, so callers that publish immediately can pass
   * the field without effect. Untrusted input is re-validated via
   * `parseFeedbackTopics` here — unknown values surface as a
   * validation error rather than silently slipping through.
   */
  feedbackTopics?: readonly ChunkFeedbackTopic[];
  /**
   * The game move this chunk was authored from ("create a chunk from this
   * position"). When present and the caller may link to it, the new chunk
   * is linked to that move inside the create transaction. Re-validated
   * here because it arrives from the client via sessionStorage.
   */
  linkTarget?: { gameId: string; ply: number } | null;
}): Promise<CreateChunkResult> {
  const feedbackTopics = parseFeedbackTopics(input.feedbackTopics);
  if (feedbackTopics === null) {
    return { error: 'invalidFeedbackTopic' };
  }

  return createChunkEntry(
    {
      representativeFen: input.representativeFen,
      title: input.title,
      slug: input.slug,
      description: input.description,
      annotations: input.annotations,
      status: input.status ?? 'draft',
      feedbackTopics,
      // userId is overwritten inside `createChunkEntry` from the
      // authenticated Supabase user; the empty string is a placeholder so
      // the shared `ChunkMutationData` shape stays satisfied.
      userId: '',
    },
    {
      // Untrusted (round-trips through the client's sessionStorage), so the
      // shape is re-asserted here; whether the game exists and the caller
      // may link to it is settled inside the transaction.
      linkTarget: isChunkLinkTarget(input.linkTarget) ? input.linkTarget : undefined,
    }
  );
}
