import type { ActionResult } from '@/lib/action-types';

import type { AttachmentKind } from '../_actions/removePostAttachment';

/**
 * Shared shapes for the topic_post Server Actions that client components
 * receive as props.
 *
 * Each action is bound at the page level (which knows the concrete
 * implementation — chunks vs squares vs openings vs practice surfaces)
 * and threaded down through CommentTree / CommentNode / OpCard /
 * TopicPostDetailLayout / EditableAttachments / DeletePostButton /
 * LikeButton / etc. Centralising the types keeps the component prop
 * surfaces honest and lets a future change to a Server Action's contract
 * land in one place rather than across ten inline `type X = (...) => ...`
 * declarations.
 *
 * The implementations themselves still live in
 * `topics/_actions/*` (and a couple of topic-specific wrappers under
 * each page's `_actions/`); these types are the shape, not the binding.
 */

export type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

export type DeletePostAction = (postId: string, locale: string) => Promise<ActionResult>;

export type EditPostAction = (
  postId: string,
  locale: string,
  formData: FormData
) => Promise<
  { success: true; content: string; isSpoiler: boolean; updatedAt: Date } | { error: string }
>;

export type RemoveAttachmentAction = (
  postId: string,
  attachmentId: string,
  kind: AttachmentKind,
  locale: string
) => Promise<{ success: true } | { error: string }>;

export type AttachAction = (
  postId: string,
  locale: string,
  formData: FormData
) => Promise<{ success: true; attachment: { id: string } } | { error: string }>;
