import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import type { User } from '@supabase/supabase-js';

import type { ActionResult } from '@/lib/action-types';

import { LinkedText, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import type { Locale } from '@/app/[locale]/_lib/types';

import { formatAbsoluteDateTime } from '../_lib/absolute-time';
import { buildCommentTree } from '../_lib/comment-tree';
import type { PostWithReplyMeta, SortMode } from '../_lib/shared';
import { CommentTree } from './CommentTree';
import { DeletePostButton } from './DeletePostButton';
import { JoinConversationToggle } from './JoinConversationToggle';
import { LikeButton } from './LikeButton';
import { ReplyForm } from './ReplyForm';
import type { ReplyAttachmentActions } from './ReplyForm';
import { SortSelect } from './SortSelect';

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type DeletePostAction = (postId: string, locale: string) => Promise<ActionResult>;

type Props = {
  locale: Locale;
  pageTitle: string;
  sectionTitle: string;
  /** Topic-specific visual rendered above the OP body (board component, etc.) */
  topicVisual: ReactNode;
  /**
   * Per-OP metadata rendered inside the OP card, between the author
   * header and the body — e.g. an opening's preference / proficiency
   * rating, a chunk's attached game card or embed. Sitting inside the
   * card keeps these visually attached to the post they belong to,
   * matching how `main`'s `PostDetailContent` placed `extraContent`.
   */
  opMeta?: ReactNode;
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
 * Page-level layout for `/topics/<family>/<key>/posts/<postId>` and
 * `/chunks/<slug>/posts/<postId>`. Layout shape:
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
  rootWithMeta,
  replies,
  user,
  topicKey,
  canReply,
  replyRestrictionMessage,
  toggleLikeAction,
  deletePostAction,
  replyAttachmentActions,
  redirectPath,
  i18n,
  enableSpoiler = false,
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
  const replyCount = replies.length;

  const authorName =
    rootWithMeta.author?.displayName || rootWithMeta.author?.username || 'Anonymous';
  const profileHref = rootWithMeta.author?.username ? `/u/${rootWithMeta.author.username}` : null;
  const isOwnPost = user?.id === rootWithMeta.userId;

  return (
    <PageLayout title={pageTitle} locale={locale} breadcrumb={breadcrumbItems} divider={false}>
      <SectionTitle>{sectionTitle}</SectionTitle>

      {topicVisual}

      {/*
        OP card — the bordered surface ("カード" in product language)
        that surfaces the post text as the page's main content. Mirrors
        the shape `main`'s `PostDetailContent` carried before the
        fix-comments refactor unified everything into CommentNode; the
        unified treatment was rolled back here because readers were
        interpreting the OP as just-another comment.
      */}
      <div className="p-4 bg-card border border-border rounded-lg space-y-4">
        <UserAvatar
          profileHref={profileHref}
          avatarUrl={rootWithMeta.author?.avatarUrl}
          displayName={authorName}
          locale={locale}
          size="md"
          flair={rootWithMeta.author?.flair}
          country={rootWithMeta.author?.country}
        >
          <div className="text-sm text-muted-foreground">
            <time dateTime={rootWithMeta.createdAt.toISOString()}>
              {formatAbsoluteDateTime(rootWithMeta.createdAt, locale, 'long')}
            </time>
          </div>
        </UserAvatar>

        {opMeta}

        <div className="text-foreground whitespace-pre-wrap break-words leading-relaxed">
          <LinkedText text={rootWithMeta.content} locale={locale} />
        </div>

        <div className="flex items-center gap-4">
          <LikeButton
            postId={rootWithMeta.id}
            locale={locale}
            topicKey={topicKey}
            initialLikeCount={rootWithMeta.likeMeta.likeCount}
            initialLikedByMe={rootWithMeta.likeMeta.likedByMe}
            toggleLikeAction={toggleLikeAction}
            i18nNamespace={i18n.likeNamespace}
          />
          {isOwnPost && (
            <DeletePostButton
              postId={rootWithMeta.id}
              locale={locale}
              redirectPath={redirectPath}
              deletePostAction={deletePostAction}
              i18nNamespace={i18n.deleteNamespace}
            />
          )}
        </div>
      </div>

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
            i18n={i18n}
            threadRootPostId={rootWithMeta.id}
          />
        </>
      )}

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}
