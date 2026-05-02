import type { ReactNode } from 'react';

import { ADSENSE_SLOT_CONTENT_BOTTOM, ADSENSE_SLOT_CONTENT_MIDDLE, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';
import type { User } from '@supabase/supabase-js';

import type { ActionResult } from '@/lib/action-types';

import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

import { buildCommentTree, groupReplies } from '../_lib/comment-tree';
import type { PostWithReplyMeta } from '../_lib/shared';
import { CommentNode } from './CommentNode';

type CreateReplyState = { error?: string };

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type DeletePostAction = (postId: string, locale: string) => Promise<ActionResult>;

type CreateReplyAction = (
  locale: string,
  topicKey: string,
  postId: string,
  prevState: CreateReplyState,
  formData: FormData
) => Promise<CreateReplyState>;

type Props = {
  locale: Locale;
  pageTitle: string;
  sectionTitle: string;
  /** Topic-specific visual rendered above the comment thread (board component, etc.) */
  topicVisual: ReactNode;
  backLink: {
    href: string;
    label: string;
  };
  /** OP enriched with reply / like meta. Becomes the single root of the comment tree. */
  rootWithMeta: PostWithReplyMeta;
  /** All descendants of the OP (every level, flat). Fed to `buildCommentTree`. */
  replies: PostWithReplyMeta[];
  user: User | null;
  topicKey: string;
  /**
   * Whether the *current user* may post replies in this thread (derived from
   * the OP's `replyPermission`). Forwarded to every node so the inline
   * Reply button only appears when authorized.
   */
  canReply: boolean;
  /**
   * Human-readable explanation shown when `canReply` is false because of a
   * follower-only / nobody restriction (rather than because the user is
   * signed out). Rendered below the thread.
   */
  replyRestrictionMessage: string | null;
  toggleLikeAction: ToggleLikeAction;
  deletePostAction: DeletePostAction;
  createReplyAction: CreateReplyAction;
  redirectPath: string;
  i18n: {
    likeNamespace: string;
    replyNamespace: string;
    deleteNamespace: string;
  };
  /** Per-OP payload (rating display, attached game card) rendered inside the root node. */
  extraContent?: ReactNode;
  /**
   * Forwarded to `CommentNode`. Currently only `position_puzzle` flips this
   * on; topic post detail pages keep replies fully visible.
   */
  enableSpoiler?: boolean;
  breadcrumbItems: BreadcrumbItem[];
};

/**
 * Page-level layout for `/topics/<family>/<key>/posts/<postId>` and
 * `/chunks/<slug>/posts/<postId>`. Renders the OP and every descendant as
 * a single-root `CommentNode` tree so the visual treatment matches the
 * puzzle / position-memory threads (Reddit-style nested replies, inline
 * reply form per node, optional spoiler overlay).
 */
export function TopicPostDetailLayout({
  locale,
  pageTitle,
  sectionTitle,
  topicVisual,
  backLink,
  rootWithMeta,
  replies,
  user,
  topicKey,
  canReply,
  replyRestrictionMessage,
  toggleLikeAction,
  deletePostAction,
  createReplyAction,
  redirectPath,
  i18n,
  extraContent,
  enableSpoiler = false,
  breadcrumbItems,
}: Props) {
  const [root] = buildCommentTree([rootWithMeta, ...replies], 'new');

  return (
    <div className="space-y-8">
      <PageTitle>{pageTitle}</PageTitle>

      <PagePanel>
        <SectionTitle>{sectionTitle}</SectionTitle>

        {topicVisual}

        <div>
          <Link
            href={backLink.href}
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; {backLink.label}
          </Link>
        </div>

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_MIDDLE) && (
          <AdSenseGuard slot="content-middle" slotId={ADSENSE_SLOT_CONTENT_MIDDLE ?? ''} />
        )}

        <CommentNode
          node={root}
          rootPostId={root.id}
          replyGroups={groupReplies(root)}
          locale={locale}
          topicKey={topicKey}
          currentUserId={user?.id}
          canReply={canReply}
          enableSpoiler={enableSpoiler}
          redirectPath={redirectPath}
          toggleLikeAction={toggleLikeAction}
          createReplyAction={createReplyAction}
          deletePostAction={deletePostAction}
          i18n={i18n}
          extraContent={extraContent}
        />

        {replyRestrictionMessage && (
          <p className="text-xs text-muted-foreground/60 italic">{replyRestrictionMessage}</p>
        )}

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Breadcrumb items={breadcrumbItems} locale={locale} />
      </PagePanel>
    </div>
  );
}
