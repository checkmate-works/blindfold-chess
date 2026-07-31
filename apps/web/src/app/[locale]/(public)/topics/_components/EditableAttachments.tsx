'use client';

import { useState } from 'react';

import type { PostAttachment } from '@/lib/games/get-attachments-for-posts';

import type { AttachAction, RemoveAttachmentAction } from '../_lib/action-types';
import { AttachmentAddButton } from './AttachmentAddButton';
import { AttachmentEditor } from './AttachmentEditor';

type Props = {
  postId: string;
  locale: string;
  /** Current attachment for this post, or `null` if none. */
  attachment: PostAttachment | null;
  removeAttachmentAction: RemoveAttachmentAction;
  /**
   * Optional attach actions. When present, the component surfaces an
   * "Add attachment" affordance whenever the post has no current
   * attachment — clicking it opens `AttachmentModal` and routes the
   * selected kind to the matching action. Omitting both keeps the
   * component remove-only (Phase 2A contract).
   */
  attachPgnAction?: AttachAction;
  attachFenAction?: AttachAction;
  fallbackVideoTitle: string;
};

/**
 * Edit-mode view of a topic_post's attachment row: a thin switch between the
 * two independent flows — `AttachmentAddButton` when the post has no
 * attachment, `AttachmentEditor` (card + remove affordances) when it does.
 * Each flow owns its own pending/error state so their banners never
 * cross-contaminate.
 *
 * Local state mirrors the server-side attachment: a successful remove
 * updates the mirror without a router round-trip, and after a successful
 * attach (which `router.refresh()`es) the render-phase adjustment below
 * swaps the fresh `attachment` prop in.
 */
export function EditableAttachments({
  postId,
  locale,
  attachment,
  removeAttachmentAction,
  attachPgnAction,
  attachFenAction,
  fallbackVideoTitle,
}: Props) {
  const [local, setLocal] = useState<PostAttachment | null>(attachment);

  // Adopt a changed `attachment` prop during render (standard "derive state
  // from props" adjustment) — the sync-effect version rendered one frame
  // with the stale mirror first. A local remove (prop unchanged) is
  // untouched, exactly as before.
  const [prevAttachment, setPrevAttachment] = useState(attachment);
  if (attachment !== prevAttachment) {
    setPrevAttachment(attachment);
    setLocal(attachment);
  }

  const canAttach = !local && (attachPgnAction !== undefined || attachFenAction !== undefined);

  if (!local && !canAttach) return null;

  if (!local) {
    return (
      <AttachmentAddButton
        postId={postId}
        locale={locale}
        attachPgnAction={attachPgnAction}
        attachFenAction={attachFenAction}
      />
    );
  }

  return (
    <AttachmentEditor
      postId={postId}
      locale={locale}
      attachment={local}
      onAttachmentChange={setLocal}
      removeAttachmentAction={removeAttachmentAction}
      fallbackVideoTitle={fallbackVideoTitle}
    />
  );
}
