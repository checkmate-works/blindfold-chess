'use server';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { UpdateChunkResult } from '@/lib/chunks/user-chunk-mutations';
import { updateChunkEntry } from '@/lib/chunks/user-chunk-mutations';
import type { ChunkFeedbackTopic } from '@/lib/chunks/validation';
import { parseFeedbackTopics } from '@/lib/chunks/validation';

/**
 * Public-facing wrapper around `updateChunkEntry`. `userId` is filled
 * from the authenticated session inside `updateChunkEntry`, so it is
 * omitted from the input.
 *
 * `slug` is optional: omitting it preserves the existing slug;
 * supplying a different one triggers a draft-only rename and
 * `updateChunkEntry` cascades the change to `topic_posts.topic_key`
 * for chunk-typed discussions in the same transaction. Published
 * chunks reject any slug — the entry layer returns
 * `cannotEditPublished` for that case.
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
    slug?: string;
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
    slug: input.slug,
    description: input.description,
    annotations: input.annotations,
    feedbackTopics,
    userId: '',
  });
}
