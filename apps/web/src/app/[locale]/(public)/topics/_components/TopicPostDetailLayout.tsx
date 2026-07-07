import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import type { User } from '@supabase/supabase-js';

import type { PostAttachment } from '@/lib/games/get-attachments-for-posts';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

import type {
  AttachAction,
  DeletePostAction,
  EditPostAction,
  RemoveAttachmentAction,
  ToggleLikeAction,
} from '../_lib/action-types';
import { buildCommentTree } from '../_lib/comment-tree';
import type { PostWithReplyMeta, SortMode } from '../_lib/shared';
import { CommentTree } from './CommentTree';
import { JoinConversationToggle } from './JoinConversationToggle';
import { OpCard } from './OpCard';
import { ReplyForm } from './ReplyForm';
import type { ReplyAttachmentActions } from './ReplyForm';
import { SortSelect } from './SortSelect';

type Props = {
  locale: Locale;
  pageTitle: string;
  sectionTitle: string;
  /** Topic-specific visual rendered above the OP body (board component, etc.) */
  topicVisual: ReactNode;
  /**
   * Per-OP metadata rendered inside the OP card, between the author
   * header and the body — e.g. an opening's preference / proficiency
   * rating. Sits ABOVE the body so it reads as metadata about the
   * post (rating-style annotations) rather than inline content.
   * Attachments don't go here — use `opAttachment` so the layout
   * matches how comments render their attachments (after the body).
   */
  opMeta?: ReactNode;
  /**
   * Per-OP attachment payload rendered inside the OP card BELOW the
   * body, just above the like / delete row. Mirrors how `CommentNode`
   * positions its own attachment relative to the comment body, so the
   * OP and every reply present attachments in the same place. Pass
   * the resolved `<AttachedGameCard />` / `<AttachedFenCard />` /
   * etc. directly — the page does the `getAttachmentsForPosts` +
   * `renderAttachment` upstream because this is a server component.
   */
  opAttachment?: ReactNode;
  /** OP enriched with reply / like meta. Rendered as a standalone card. */
  rootWithMeta: PostWithReplyMeta;
  /**
   * All descendants of the OP (every level, flat). Direct children of the
   * OP become the roots of the comment tree shown below the OP card; their
   * own descendants stay nested under them.
   */
  replies: PostWithReplyMeta[];
  user: User | null;
  topicKey: string;
  /**
   * Whether the *current user* may post replies in this thread (derived from
   * the OP's `replyPermission`). Controls whether the JoinConversationToggle
   * / ReplyForm renders or whether the restriction message is shown instead.
   */
  canReply: boolean;
  /**
   * Human-readable explanation shown when `canReply` is false because of a
   * follower-only / nobody restriction (rather than because the user is
   * signed out).
   */
  replyRestrictionMessage: string | null;
  toggleLikeAction: ToggleLikeAction;
  deletePostAction: DeletePostAction;
  /**
   * Optional in-place edit Server Action. When provided, the OP card and
   * every author-owned reply in the tree expose an "Edit" button. Pages
   * pass `editPost` from `@/app/[locale]/(public)/topics/_actions/editPost`
   * — the action is polymorphic across topic types.
   */
  editPostAction?: EditPostAction;
  /**
   * Optional attachment-remove Server Action. When provided, every
   * author-owned post in the tree — OP card included — exposes a remove
   * affordance for its attachment in edit mode.
   */
  removeAttachmentAction?: RemoveAttachmentAction;
  /**
   * Optional edit-flow attach actions. When provided, every author-owned
   * post in the tree (OP card + replies) surfaces an "Add attachment"
   * affordance in edit mode whenever the post has no current attachment.
   */
  attachPgnAction?: AttachAction;
  attachFenAction?: AttachAction;
  /**
   * Raw attachment payloads keyed by post id, used by the edit-side
   * renderer. Pages already compute this via `getAttachmentsForPosts`
   * for the read-side `extraContentByPostId` / `opAttachment` slots;
   * pass the same map through here so the edit-side EditableAttachments
   * can wire remove buttons against the same data.
   */
  attachmentsByPostId?: ReadonlyMap<string, PostAttachment>;
  /** Fallback `<AttachedVideoCard>` title used by the edit-side renderer. */
  attachmentFallbackVideoTitle?: string;
  /**
   * Attachment-aware reply Server Actions (PGN + FEN). Bound by every
   * `ReplyForm` rendered on this page (top-level CTA + inline replies
   * inside `CommentTree`) so submits route through the right base.
   */
  replyAttachmentActions: ReplyAttachmentActions;
  redirectPath: string;
  i18n: {
    likeNamespace: string;
    replyNamespace: string;
    deleteNamespace: string;
  };
  /**
   * Forwarded to `CommentTree` to enable per-reply spoiler treatment.
   * Currently no topic post detail surface flips this on (puzzle, which
   * does, lives under `/practice/...` and renders its own page); kept as a
   * knob for future use.
   */
  enableSpoiler?: boolean;
  /**
   * Per-post attachment payload for entries inside the reply tree, keyed
   * by post id. The OP's own attachment continues to flow through
   * `opMeta` (rendered inside the OP card); this prop covers each reply.
   * Pages compute this with one `getAttachmentsForPosts(replies.map(r =>
   * r.id))` call and `renderAttachment(...)` per entry.
   */
  extraContentByPostId?: ReadonlyMap<string, React.ReactNode>;
  /** Comments-section i18n + sort wiring. */
  comments: {
    /** Section title above the form / sort / list (e.g. "Replies"). */
    sectionTitle: string;
    /**
     * Number of replies. Passed to `JoinConversationToggle` as `count`
     * — the icon disambiguates the unit so the noun is suppressed.
     */
    count: number;
    sortBy: SortMode;
    sortBasePath: string;
    sortTranslationKey: string;
  };
  breadcrumbItems: BreadcrumbItem[];
};

/**
 * Page-level layout for `/topics/<family>/<key>/posts/<postId>`. Layout shape:
 *
 *   1. Topic visual (board) + per-OP metadata (rating, attachment) up top.
 *   2. The OP rendered as a self-contained card (avatar, time, body,
 *      like, delete) — same shape `PostDetailContent` carried on `main`,
 *      so readers do not perceive the OP as just-another comment.
 *   3. A "Replies" section: Reddit-style JoinConversationToggle CTA →
 *      ReplyForm, SortSelect, then the reply tree with each direct child
 *      of the OP rendered as its own root via `CommentTree`.
 *
 * The OP is intentionally NOT routed through `buildCommentTree`: the URL
 * `postId` is occasionally a reply id (notification deep links, manually
 * pasted reply URLs), and treating that as a tree root yields an empty
 * tree (the reply has a non-null `parentId` whose target is not in the
 * fetched window). Rendering the OP directly from `rootWithMeta` matches
 * how `main` displayed it and keeps the page resilient to that case.
 */
export async function TopicPostDetailLayout({
  locale,
  pageTitle,
  sectionTitle,
  topicVisual,
  opMeta,
  opAttachment,
  rootWithMeta,
  replies,
  user,
  topicKey,
  canReply,
  replyRestrictionMessage,
  toggleLikeAction,
  deletePostAction,
  editPostAction,
  removeAttachmentAction,
  attachPgnAction,
  attachFenAction,
  attachmentsByPostId,
  attachmentFallbackVideoTitle,
  replyAttachmentActions,
  redirectPath,
  i18n,
  enableSpoiler = false,
  extraContentByPostId,
  comments,
  breadcrumbItems,
}: Props) {
  const tTopics = await getTranslations({ locale, namespace: 'topics' });

  // Promote direct replies to OP into roots of the reply tree so each one
  // shows as a peer comment (like position-memory / puzzle) instead of
  // being indented one level under the OP. Deeper replies keep their
  // `parentId` and remain nested under their actual parent reply.
  const opId = rootWithMeta.id;
  const repliesAsRoots = replies.map((r) => (r.parentId === opId ? { ...r, parentId: null } : r));
  const replyRoots = buildCommentTree(repliesAsRoots, comments.sortBy);
  // Count only live comments. `getRepliesByPostId` returns soft-deleted rows
  // too (the tree keeps "[deleted]" tombstones that still have live
  // descendants), but a tombstone is not a real comment — counting it would
  // inflate the "Join the conversation" badge and keep an all-deleted thread
  // out of the empty-state (reply-form) branch.
  const replyCount = replies.filter((r) => !r.deletedAt).length;

  return (
    <PageLayout title={pageTitle} locale={locale} breadcrumb={breadcrumbItems} divider={false}>
      <SectionTitle>{sectionTitle}</SectionTitle>

      {topicVisual}

      {/*
        OP card — the bordered surface ("カード" in product language)
        that surfaces the post text as the page's main content. Lifted
        into its own client boundary (`OpCard`) so the body can swap to
        an inline edit form when the author clicks "Edit". The card
        otherwise mirrors `main`'s pre-refactor `PostDetailContent` shape;
        treating the OP as a peer comment was rolled back because readers
        were interpreting it as just-another reply.
      */}
      <OpCard
        postId={rootWithMeta.id}
        locale={locale}
        topicKey={topicKey}
        userId={rootWithMeta.userId}
        currentUserId={user?.id}
        author={rootWithMeta.author}
        initialContent={rootWithMeta.content}
        createdAt={rootWithMeta.createdAt}
        updatedAt={rootWithMeta.updatedAt}
        opMeta={opMeta}
        opAttachment={opAttachment}
        initialLikeCount={rootWithMeta.likeMeta.likeCount}
        initialLikedByMe={rootWithMeta.likeMeta.likedByMe}
        toggleLikeAction={toggleLikeAction}
        deletePostAction={deletePostAction}
        editPostAction={editPostAction}
        removeAttachmentAction={removeAttachmentAction}
        attachPgnAction={attachPgnAction}
        attachFenAction={attachFenAction}
        opAttachmentRaw={attachmentsByPostId?.get(rootWithMeta.id) ?? null}
        attachmentFallbackVideoTitle={attachmentFallbackVideoTitle}
        redirectPath={redirectPath}
        likeI18nNamespace={i18n.likeNamespace}
        deleteI18nNamespace={i18n.deleteNamespace}
      />

      <SectionTitle>{comments.sectionTitle}</SectionTitle>

      {user && !canReply ? (
        replyRestrictionMessage && (
          <p className="text-sm text-muted-foreground italic">{replyRestrictionMessage}</p>
        )
      ) : user && replyCount === 0 ? (
        <ReplyForm
          locale={locale}
          topicKey={topicKey}
          postId={rootWithMeta.id}
          attachmentActions={replyAttachmentActions}
          i18nNamespace={i18n.replyNamespace}
        />
      ) : (
        <JoinConversationToggle count={comments.count} joinLabel={tTopics('joinConversation')}>
          <ReplyForm
            locale={locale}
            topicKey={topicKey}
            postId={rootWithMeta.id}
            attachmentActions={replyAttachmentActions}
            i18nNamespace={i18n.replyNamespace}
          />
        </JoinConversationToggle>
      )}

      {replyCount > 0 && (
        <>
          <SortSelect
            basePath={comments.sortBasePath}
            translationKey={comments.sortTranslationKey}
            currentSort={comments.sortBy}
          />
          <CommentTree
            comments={replyRoots}
            locale={locale}
            topicKey={topicKey}
            currentUserId={user?.id}
            enableSpoiler={enableSpoiler}
            redirectPath={redirectPath}
            toggleLikeAction={toggleLikeAction}
            replyAttachmentActions={replyAttachmentActions}
            deletePostAction={deletePostAction}
            editPostAction={editPostAction}
            removeAttachmentAction={removeAttachmentAction}
            attachPgnAction={attachPgnAction}
            attachFenAction={attachFenAction}
            attachmentsByPostId={attachmentsByPostId}
            attachmentFallbackVideoTitle={attachmentFallbackVideoTitle}
            i18n={i18n}
            threadRootPostId={rootWithMeta.id}
            extraContentByPostId={extraContentByPostId}
          />
        </>
      )}

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
