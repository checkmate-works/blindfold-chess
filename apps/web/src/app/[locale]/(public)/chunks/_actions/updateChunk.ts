'use server';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { UpdateChunkResult } from '@/lib/chunks/user-chunk-mutations';
import { updateChunkEntry } from '@/lib/chunks/user-chunk-mutations';
import type { ChunkFeedbackTopic } from '@/lib/chunks/validation';
import { parseFeedbackTopics } from '@/lib/chunks/validation';

/**
 * Public-facing wrapper around `updateChunkEntry`. Slug is intentionally
 * NOT accepted — chunks are catalog URLs and the slug is fixed at
 * creation. `userId` is filled from the authenticated session inside
 * `updateChunkEntry`, so it is also omitted from the input.
 *
 * `feedbackTopics === undefined` preserves whatever rows the chunk
 * currently has; passing `[]` explicitly wipes them. This mirrors the
 * `ChunkMutationData.feedbackTopics` contract — see its TSDoc for the
 * exact preserve / replace semantics. Untrusted input is re-validated
 * here via `parseFeedbackTopics`.
 */
export async function updateChunk(
  id: string,
  input: {
    representativeFen: string;
    title: string;
    description?: string | null;
    annotations?: BoardAnnotations;
    feedbackTopics?: readonly ChunkFeedbackTopic[];
  }
): Promise<UpdateChunkResult> {
  let feedbackTopics: ChunkFeedbackTopic[] | undefined;
  if (input.feedbackTopics !== undefined) {
    const parsed = parseFeedbackTopics(input.feedbackTopics);
    if (parsed === null) {
      return { error: 'invalidFeedbackTopic' };
    }
    feedbackTopics = parsed;
  }

  return updateChunkEntry(id, {
    representativeFen: input.representativeFen,
    title: input.title,
    description: input.description,
    annotations: input.annotations,
    feedbackTopics,
    userId: '',
  });
}
