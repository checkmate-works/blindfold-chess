'use client';

import { memo } from 'react';
import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getStartingFen } from '@blindfold-chess/features/chess-core';

import { truncateContent } from '@/lib/content/truncate-content';
import { MiniBoard } from '@/lib/positions/ui/MiniBoard';

import { PostFooter } from '@/app/[locale]/(public)/topics/_components/PostFooter';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';
import { RatingDisplay } from '@/app/[locale]/(public)/topics/openings/[slug]/_components/RatingDisplay';
import { toggleLike as toggleLikeOpening } from '@/app/[locale]/(public)/topics/openings/[slug]/posts/[postId]/_actions/toggleLike';
import { isBlackOpening } from '@/app/[locale]/(public)/topics/openings/_lib/openings';
import { toggleLike as toggleLikeSquare } from '@/app/[locale]/(public)/topics/squares/[square]/posts/[postId]/_actions/toggleLike';
import { LinkedText } from '@/app/[locale]/_components';
import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';

import { TopicSquareBoard } from './TopicSquareBoard';

type Props = {
  post: ProfilePostWithReplyMeta;
  locale: string;
  showMoreLabel: string;
  justNowLabel: string;
  variant?: 'feed' | 'card';
  /**
   * Pre-rendered attachment slot (e.g. `<AttachedGameCard />`). Currently
   * surfaced by the openings index page so a top-level post with an
   * attached game / FEN / embed renders the card alongside the content
   * preview. The home feed call site intentionally omits this — feed
   * variants stay compact and don't surface per-post attachments.
   */
  attachment?: ReactNode;
};

export const TopicPostCard = memo(function TopicPostCard({
  post,
  locale,
  showMoreLabel,
  justNowLabel,
  variant,
  attachment,
}: Props) {
  const tTopics = useTranslations('topics');
  const tCommon = useTranslations('Common');
  const displayName = post.author?.displayName || post.author?.username || tCommon('deletedUser');
  const contentPreview = truncateContent(post.content);
  const isTruncated = contentPreview !== post.content;
  const isOpening = post.topicType === 'opening';

  const isReply = post.rootPostId != null;
  const postId = isReply ? post.rootPostId : post.id;
  const anchor = isReply ? `#reply-${post.id}` : '';
  const href = isOpening
    ? `/topics/openings/${post.topicKey}/posts/${postId}${anchor}`
    : `/topics/squares/${post.topicKey}/posts/${postId}${anchor}`;

  // Layout note (HTML / a11y): ActivityCard never wraps its body in an
  // outer <a>. Wrapping it would nest the inline <a> elements emitted by
  // <LinkedText> for URLs in the post body, and would also nest the
  // <button> in <LikeButton> — both are invalid HTML and produce
  // hydration errors. The post-detail link is rendered as a permalink
  // anchor on the relative timestamp (Twitter / Mastodon / GitHub
  // pattern), keeping a crawler-discoverable <a href> per post for SEO.
  return (
    <ActivityCard
      variant={variant}
      href={href}
      locale={locale}
      thumbnail={
        isOpening ? (
          <MiniBoard
            fen={post.openingFen ?? getStartingFen()}
            responsive
            flipped={isBlackOpening(post.openingFen ?? getStartingFen())}
          />
        ) : (
          <TopicSquareBoard square={post.topicKey} />
        )
      }
      author={
        <UserAvatar
          profileHref={post.author?.username ? `/u/${post.author.username}` : null}
          avatarUrl={post.author?.avatarUrl}
          displayName={displayName}
          locale={locale}
          size="sm"
          flair={post.author?.flair}
          country={post.author?.country}
        />
      }
      permalink={
        <Link
          href={href}
          locale={locale}
          className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          aria-label={tTopics('permalinkAriaLabel')}
        >
          <time dateTime={post.createdAt.toISOString()}>
            {formatRelativeTime(new Date(post.createdAt), locale, justNowLabel)}
          </time>
        </Link>
      }
      footer={
        <PostFooter
          postId={post.id}
          locale={locale}
          topicKey={post.topicKey}
          likeMeta={post.likeMeta}
          replyMeta={post.replyMeta}
          toggleLikeAction={isOpening ? toggleLikeOpening : toggleLikeSquare}
          i18nNamespace={isOpening ? 'topics.openings' : 'topics.squares'}
          postHref={href}
        />
      }
    >
      {isOpening
        ? // For opening posts the badge text is the opening's name
          // (e.g. "Sicilian Defense") — wrap it in a Link to the post
          // detail so it doubles as the SEO-friendly title anchor for
          // the card. Without this the only crawler-visible anchor
          // text is the relative timestamp on the permalink, which is
          // a weak signal for the destination.
          post.openingName && (
            <Link
              href={href}
              locale={locale}
              className="inline-flex items-center self-start px-1.5 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {post.openingName}
            </Link>
          )
        : // Square posts use the algebraic-notation key (e.g. "e4") as
          // the badge. Same Link treatment applies — the square name
          // is meaningful anchor text for crawlers.
          post.topicKey && (
            <Link
              href={href}
              locale={locale}
              className="inline-flex items-center self-start px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {post.topicKey}
            </Link>
          )}
      {isOpening && post.rating && (
        <div className="mb-1">
          <RatingDisplay
            preferenceRating={post.rating.preferenceRating}
            proficiencyRating={post.rating.proficiencyRating}
          />
        </div>
      )}
      <p className="text-sm text-foreground break-words mt-3 line-clamp-3">
        <LinkedText text={contentPreview} locale={locale} />
      </p>
      {isTruncated && (
        <Link
          href={href}
          locale={locale}
          className="text-sm text-link-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          {showMoreLabel}
        </Link>
      )}
      {attachment && <div className="mt-3">{attachment}</div>}
    </ActivityCard>
  );
});
