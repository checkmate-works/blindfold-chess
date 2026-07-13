'use client';

import { type ReactNode, createContext, useContext } from 'react';

import type { PostAttachment } from '@/lib/games/get-attachments-for-posts';

import type {
  AttachAction,
  DeletePostAction,
  EditPostAction,
  RemoveAttachmentAction,
  ToggleLikeAction,
} from '../_lib/action-types';
import type { MoveNotationLine } from '../_lib/move-notation';
import type { ReplyAttachmentActions } from './ReplyForm';

export type CommentTreeI18n = {
  likeNamespace: string;
  replyNamespace: string;
  deleteNamespace: string;
};

/**
 * Everything a `CommentNode` needs that is constant across one thread —
 * the thread root id, locale, the Server Actions, i18n namespaces, and the
 * per-post attachment / extra-content maps.
 *
 * `rootPostId` and `canReply` are constant *within* a thread but differ
 * between the independent threads `CommentTree` renders, so the provider is
 * mounted once per thread root rather than once for the whole list.
 *
 * Previously these 18 values were passed to `CommentNode` as props and then
 * forwarded verbatim through both recursive `<CommentNode>` call sites — a
 * bucket brigade that forced six edits for every new field. The context
 * carries them instead; only the genuinely per-node props (`node`,
 * `replyGroups` / `flatReplies`, `replyToDisplayName`) remain props.
 */
export type CommentTreeContextValue = {
  rootPostId: string;
  locale: string;
  topicKey: string;
  currentUserId?: string;
  canReply: boolean;
  enableSpoiler: boolean;
  redirectPath: string;
  toggleLikeAction: ToggleLikeAction;
  replyAttachmentActions: ReplyAttachmentActions;
  deletePostAction: DeletePostAction;
  editPostAction?: EditPostAction;
  removeAttachmentAction?: RemoveAttachmentAction;
  attachPgnAction?: AttachAction;
  attachFenAction?: AttachAction;
  attachmentsByPostId?: ReadonlyMap<string, PostAttachment>;
  attachmentFallbackVideoTitle?: string;
  i18n: CommentTreeI18n;
  extraContentByPostId?: ReadonlyMap<string, ReactNode>;
  /**
   * When set, comment bodies in this thread are rendered move-notation-aware:
   * a legal SAN run (e.g. "Bxa7 b6") written against this base position
   * becomes a button that opens a board preview. Set only by surfaces that
   * anchor a whole thread to one position (chunks); absent everywhere else,
   * where bodies render as plain linkified text (unchanged behavior).
   */
  moveNotationFen?: string;
  /**
   * Like {@link moveNotationFen}, but for a thread anchored to a whole line of
   * play (a repertoire line): references carry move numbers ("1... e4"), so the
   * parser needs the line's moves to resolve them. Takes precedence when both
   * are set.
   */
  moveNotationLine?: MoveNotationLine;
};

const CommentTreeContext = createContext<CommentTreeContextValue | null>(null);

export function CommentTreeProvider({
  value,
  children,
}: {
  value: CommentTreeContextValue;
  children: ReactNode;
}) {
  return <CommentTreeContext.Provider value={value}>{children}</CommentTreeContext.Provider>;
}

export function useCommentTreeContext(): CommentTreeContextValue {
  const ctx = useContext(CommentTreeContext);
  if (ctx === null) {
    throw new Error('useCommentTreeContext must be used within a CommentTreeProvider');
  }
  return ctx;
}
