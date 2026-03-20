import { Link } from '@/i18n/routing';
import type { User } from '@supabase/supabase-js';

import { LinkedText, SectionTitle } from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { LikeMeta, PostWithReplyMeta, TopicPostWithAuthor } from '../_lib/queries';
import { DeletePostButton } from './DeletePostButton';
import { HashScrollTarget } from './HashScrollTarget';
import { LikeButton } from './LikeButton';
import { ReplySection } from './ReplySection';
import { UserAvatar } from './UserAvatar';

type CreateReplyState = { error?: string };

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type DeletePostAction = (
  postId: string,
  locale: string
) => Promise<{ success: true } | { error: string }>;

type CreateReplyAction = (
  locale: string,
  topicKey: string,
  postId: string,
  prevState: CreateReplyState,
  formData: FormData
) => Promise<CreateReplyState>;

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
  likeI18nNamespace: string;
  deleteI18nNamespace: string;
  replyI18nNamespace: string;
  repliesTitle: string;
  repliesCount: string;
  noReplies: string;
  loginToReply: string;
  extraContent?: React.ReactNode;
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
  likeI18nNamespace,
  deleteI18nNamespace,
  replyI18nNamespace,
  repliesTitle,
  repliesCount,
  noReplies,
  loginToReply,
  extraContent,
}: Props) {
  const authorName = post.author?.displayName || post.author?.username || 'Anonymous';
  const profileHref = post.author?.username ? `/@/${post.author.username}` : null;

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
            i18nNamespace={likeI18nNamespace}
          />
          {user && user.id === post.userId && (
            <DeletePostButton
              postId={post.id}
              locale={locale}
              redirectPath={redirectPath}
              deletePostAction={deletePostAction}
              i18nNamespace={deleteI18nNamespace}
            />
          )}
        </div>
      </div>

      <AdBanner slot="banner-wide" locale={locale} />

      <SectionTitle>
        {repliesTitle} ({repliesCount})
      </SectionTitle>

      {replies.length === 0 && <p className="text-sm text-muted-foreground">{noReplies}</p>}

      {canReply ? (
        user ? (
          <ReplySection
            replies={replies}
            locale={locale}
            topicKey={topicKey}
            postId={post.id}
            toggleLikeAction={toggleLikeAction}
            createReplyAction={createReplyAction}
            likeI18nNamespace={likeI18nNamespace}
            replyI18nNamespace={replyI18nNamespace}
            showForm
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
                likeI18nNamespace={likeI18nNamespace}
                replyI18nNamespace={replyI18nNamespace}
                showForm={false}
              />
            )}
            <p className="text-sm text-muted-foreground">
              <Link
                href="/sign-in"
                locale={locale}
                className="text-foreground underline hover:text-muted-foreground transition-colors"
              >
                {loginToReply}
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
              likeI18nNamespace={likeI18nNamespace}
              replyI18nNamespace={replyI18nNamespace}
              showForm={false}
            />
          )}
          {replyRestrictionMessage && (
            <p className="text-xs text-muted-foreground/60 italic">{replyRestrictionMessage}</p>
          )}
        </>
      )}

      <AdBanner slot="banner-standard" locale={locale} />

      <HashScrollTarget />
    </>
  );
}
