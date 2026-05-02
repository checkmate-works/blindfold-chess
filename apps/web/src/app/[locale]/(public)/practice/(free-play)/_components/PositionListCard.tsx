import { Link } from '@/i18n/routing';

import type { LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';
import type { Position } from '@/lib/db/schema';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';
import { truncate } from '@/lib/text';
import { resolveDisplayName } from '@/lib/users/display-name';

import { PostFooter } from '@/app/[locale]/(public)/topics/_components/PostFooter';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type Props = {
  position: Position;
  /**
   * Author profile, or `null` if the row's `user_id` did not join. Subset
   * of the `profiles` columns the calling list query selects.
   */
  profile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  likeMeta: LikeMeta;
  replyMeta: ReplyMeta;
  /**
   * Detail-page URL the card-wide click target navigates to. Each list
   * page constructs this since the URL prefix differs by position type
   * (`/practice/puzzle/...` vs `/practice/position-memory/...`).
   */
  detailHref: string;
  /**
   * `i18n` namespace passed through to PostFooter. Must contain
   * `like` / `unlike` / `newReply` / `justNow` keys (the namespace also
   * supplies the relative-time wording for this card's permalink so
   * the timestamp matches the footer's "New reply X ago" caption).
   */
  i18nNamespace: string;
  /** Per-page Server Action that toggles the position-level like. */
  toggleLikeAction: ToggleLikeAction;
  /** Resolved `t('justNow')` from `i18nNamespace`. */
  justNowLabel: string;
  locale: string;
};

/**
 * Card row used by the puzzle and position-memory list pages — and any
 * future practice surface that lists user-submitted positions.
 *
 * Composes ActivityCard with:
 * - `ThemedBoardThumbnail` for the board preview
 * - `UserAvatar` (with profile link) for the author
 * - permalink anchor on the relative timestamp
 * - `PostFooter` (LikeButton + comment summary) wired against
 *   `topicKey = position.id` (the polymorphic key positions use to
 *   attach a `topic_posts` discussion thread to themselves)
 *
 * The whole card surface navigates to `detailHref` via ActivityCard's
 * stretched background link; individually clickable children
 * (avatar profile, like button, permalink, comment-icon link, title
 * link) sit above it and keep their own click semantics.
 */
export function PositionListCard({
  position,
  profile,
  likeMeta,
  replyMeta,
  detailHref,
  i18nNamespace,
  toggleLikeAction,
  justNowLabel,
  locale,
}: Props) {
  const displayName = resolveDisplayName(profile);
  const descriptionExcerpt = truncate(position.description);

  return (
    <ActivityCard
      variant="card"
      href={detailHref}
      locale={locale}
      thumbnail={<ThemedBoardThumbnail fen={position.fen} className="w-full h-full" />}
      author={
        <UserAvatar
          profileHref={profile?.username ? `/u/${profile.username}` : null}
          avatarUrl={profile?.avatarUrl}
          displayName={displayName}
          locale={locale}
          size="sm"
        />
      }
      permalink={
        <Link
          href={detailHref}
          locale={locale}
          className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <time dateTime={position.createdAt.toISOString()}>
            {formatRelativeTime(position.createdAt, locale, justNowLabel)}
          </time>
        </Link>
      }
      footer={
        <PostFooter
          postId={position.id}
          locale={locale}
          topicKey={position.id}
          likeMeta={likeMeta}
          replyMeta={replyMeta}
          toggleLikeAction={toggleLikeAction}
          i18nNamespace={i18nNamespace}
          postHref={detailHref}
        />
      }
    >
      <h3 className="font-medium text-foreground truncate mt-2">
        <Link
          href={detailHref}
          locale={locale}
          className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          {position.title}
        </Link>
      </h3>
      {descriptionExcerpt && (
        <p className="text-sm text-muted-foreground line-clamp-2">{descriptionExcerpt}</p>
      )}
    </ActivityCard>
  );
}
