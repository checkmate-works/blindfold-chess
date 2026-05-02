import { ADSENSE_SLOT_CONTENT_BOTTOM, ADSENSE_SLOT_CONTENT_MIDDLE, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';
import type { User } from '@supabase/supabase-js';

import type { ActionResult } from '@/lib/action-types';

import { LinkedText, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { LikeMeta, PostWithReplyMeta, TopicPostWithAuthor } from '../_lib/shared';
import { DeletePostButton } from './DeletePostButton';
import { HashScrollTarget } from './HashScrollTarget';
import { LikeButton } from './LikeButton';
import { ReplySection } from './ReplySection';

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

export type PostDetailI18n = {
  likeNamespace: string;
  deleteNamespace: string;
  replyNamespace: string;
  repliesTitle: string;
  repliesCount: string;
  noReplies: string;
  loginToReply: string;
};

type Props = {
  post: TopicPostWithAuthor;
  user: User | null;
  locale: Locale;
  topicKey: string;
  likeMeta: LikeMeta;
  replies: PostWithReplyMeta[];
  canReply: boolean;
  replyRestrictionMessage: string | null;
  toggleLikeAction: ToggleLikeAction;
  deletePostAction: DeletePostAction;
  createReplyAction: CreateReplyAction;
  redirectPath: string;
  i18n: PostDetailI18n;
  extraContent?: React.ReactNode;
  /**
   * When `true`, the reply form renders an `isSpoiler` checkbox and the
   * reply list applies the same click-to-reveal overlay to flagged replies
   * that `BaseTopicPostCard` applies to top-level posts. Surfaced only by
   * `topic_type='position_puzzle'` today.
   */
  enableReplySpoiler?: boolean;
};

export function PostDetailContent({
  post,
  user,
  locale,
  topicKey,
  likeMeta,
  replies,
  canReply,
  replyRestrictionMessage,
  toggleLikeAction,
  deletePostAction,
  createReplyAction,
  redirectPath,
  i18n,
  extraContent,
  enableReplySpoiler = false,
}: Props) {
  const authorName = post.author?.displayName || post.author?.username || 'Anonymous';
  const profileHref = post.author?.username ? `/u/${post.author.username}` : null;

  return (
    <>
      <div className="p-4 bg-card border border-border rounded-lg space-y-4">
        <UserAvatar
          profileHref={profileHref}
          avatarUrl={post.author?.avatarUrl}
          displayName={authorName}
          locale={locale}
          size="md"
          flair={post.author?.flair}
          country={post.author?.country}
        >
          <div className="text-sm text-muted-foreground">
            <time dateTime={post.createdAt.toISOString()}>
              {post.createdAt.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>
        </UserAvatar>

        {extraContent}

        <div className="text-foreground whitespace-pre-wrap break-words leading-relaxed">
          <LinkedText text={post.content} locale={locale} />
        </div>

        <div className="flex items-center gap-4">
          <LikeButton
            postId={post.id}
            locale={locale}
            topicKey={topicKey}
            initialLikeCount={likeMeta.likeCount}
            initialLikedByMe={likeMeta.likedByMe}
            toggleLikeAction={toggleLikeAction}
            i18nNamespace={i18n.likeNamespace}
          />
          {user && user.id === post.userId && (
            <DeletePostButton
              postId={post.id}
              locale={locale}
              redirectPath={redirectPath}
              deletePostAction={deletePostAction}
              i18nNamespace={i18n.deleteNamespace}
            />
          )}
        </div>
      </div>

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_MIDDLE) && (
        <AdSenseGuard slot="content-middle" slotId={ADSENSE_SLOT_CONTENT_MIDDLE ?? ''} />
      )}

      <SectionTitle>
        {i18n.repliesTitle} ({i18n.repliesCount})
      </SectionTitle>

      {replies.length === 0 && <p className="text-sm text-muted-foreground">{i18n.noReplies}</p>}

      {canReply ? (
        user ? (
          <ReplySection
            replies={replies}
            locale={locale}
            topicKey={topicKey}
            postId={post.id}
            toggleLikeAction={toggleLikeAction}
            createReplyAction={createReplyAction}
            likeI18nNamespace={i18n.likeNamespace}
            replyI18nNamespace={i18n.replyNamespace}
            showForm
            enableSpoiler={enableReplySpoiler}
          />
        ) : (
          <>
            {replies.length > 0 && (
              <ReplySection
                replies={replies}
                locale={locale}
                topicKey={topicKey}
                postId={post.id}
                toggleLikeAction={toggleLikeAction}
                createReplyAction={createReplyAction}
                likeI18nNamespace={i18n.likeNamespace}
                replyI18nNamespace={i18n.replyNamespace}
                showForm={false}
                enableSpoiler={enableReplySpoiler}
              />
            )}
            <p className="text-sm text-muted-foreground">
              <Link
                href="/sign-in"
                locale={locale}
                className="text-foreground underline hover:text-muted-foreground transition-colors"
              >
                {i18n.loginToReply}
              </Link>
            </p>
          </>
        )
      ) : (
        <>
          {replies.length > 0 && (
            <ReplySection
              replies={replies}
              locale={locale}
              topicKey={topicKey}
              postId={post.id}
              toggleLikeAction={toggleLikeAction}
              createReplyAction={createReplyAction}
              likeI18nNamespace={i18n.likeNamespace}
              replyI18nNamespace={i18n.replyNamespace}
              showForm={false}
              enableSpoiler={enableReplySpoiler}
            />
          )}
          {replyRestrictionMessage && (
            <p className="text-xs text-muted-foreground/60 italic">{replyRestrictionMessage}</p>
          )}
        </>
      )}

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}

      <HashScrollTarget />
    </>
  );
}
