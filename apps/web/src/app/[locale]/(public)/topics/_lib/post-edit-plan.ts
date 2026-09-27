export type PostEditPlan = {
  content: string;
  isSpoiler: boolean;
  /**
   * The overwritten values (old → new) of the fields that actually change,
   * for the activity log: a topic_post edit rewrites content / isSpoiler in
   * place with no revision history, so the log is the only record of them.
   */
  changes: Record<string, { from: unknown; to: unknown }>;
};

/**
 * Decide what an edit writes to a topic_post, or `null` when it would change
 * nothing — the caller then skips the write so `updatedAt` does not advance
 * and the "(edited)" indicator (derived from `updatedAt > createdAt`) stays
 * honest.
 *
 * isSpoiler is only surfaced in the UI for `position_puzzle` today, so the
 * submitted flag is ignored for every other topic type: a hand-crafted
 * FormData cannot flip the column on, say, an opening post.
 */
export function planPostEdit(
  post: { topicType: string; content: string; isSpoiler: boolean },
  input: { content: string; isSpoilerChecked: boolean }
): PostEditPlan | null {
  const isSpoiler = post.topicType === 'position_puzzle' ? input.isSpoilerChecked : post.isSpoiler;

  const changes: PostEditPlan['changes'] = {};
  if (input.content !== post.content) {
    changes.content = { from: post.content, to: input.content };
  }
  if (isSpoiler !== post.isSpoiler) {
    changes.isSpoiler = { from: post.isSpoiler, to: isSpoiler };
  }

  if (Object.keys(changes).length === 0) return null;
  return { content: input.content, isSpoiler, changes };
}
