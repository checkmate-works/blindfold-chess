import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';

import type { LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';
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
  /** Entity id. Used as the LikeButton's `postId` (the action's first arg). */
  id: string;
  /** FEN rendered as the thumbnail. */
  fen: string;
  /** Card title. */
  title: string;
  /** Optional body text. Truncated for the card excerpt. */
  description: string | null;
  /** Authoring timestamp shown as the permalink anchor. */
  createdAt: Date;
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
   * Detail-page URL the card-wide click target navigates to. Constructed
   * by the caller since the URL prefix differs by entity type
   * (`/practice/puzzle/...`, `/practice/position-memory/...`, `/chunks/<slug>`).
   */
  detailHref: string;
  /**
   * Href for the comment-icon link in `PostFooter`. Defaults to `detailHref`
   * (no scroll adjustment). Pass a hash-suffixed variant matching the
   * destination page's actual comments anchor when it supports one — e.g.
   * `${detailHref}#comments` for puzzle/position-memory detail pages,
   * `${detailHref}#game-overview` for shared-game pages, or
   * `${detailHref}?tab=comments#chunk-tabs` for chunk pages — so tapping the
   * comment icon lands scrolled to that section instead of the page top.
   * The hash/target is caller-specific because `CatalogListCard` is reused
   * across several entity families with different destination layouts.
   */
  commentHref?: string;
  /**
   * `i18n` namespace passed through to PostFooter. Must contain
   * `like` / `unlike` / `newReply` / `justNow` keys.
   */
  i18nNamespace: string;
  /** Per-page Server Action that toggles the entity-level like. */
  toggleLikeAction: ToggleLikeAction;
  /** Resolved `t('justNow')` from `i18nNamespace`. */
  justNowLabel: string;
  locale: string;
  /**
   * The opaque key forwarded as the 3rd positional arg to
   * `toggleLikeAction`. Positions pass their `id`; chunks may pass their
   * `slug` since the chunk topic_posts thread is keyed by slug. The card
   * itself does not interpret it.
   */
  topicKey: string;
  /**
   * Optional badge rendered next to the title (e.g. a "Puzzle" / "Memory"
   * type indicator on mixed-type lists like the public profile).
   */
  badge?: ReactNode;
  /**
   * Optional metadata row rendered on its own line under the title (e.g. the
   * shared-games gallery's player-colour + opening row).
   */
  meta?: ReactNode;
  /**
   * Optional owner-only / management actions (e.g. an Edit link) rendered
   * directly below `PostFooter`.
   */
  actions?: ReactNode;
};

/**
 * Generic catalog list card — used by every list page that surfaces a
 * thumbnail-led, single-author, likeable + commentable entity:
 * positions (puzzle / memory), chunks, and any future catalog entry of
 * the same shape.
 *
 * Composes ActivityCard with:
 * - `ThemedBoardThumbnail` for the board preview
 * - `UserAvatar` (with profile link) for the author
 * - permalink anchor on the relative timestamp
 * - `PostFooter` (LikeButton + comment summary) wired against the
 *   caller-supplied `topicKey`
 *
 * The whole card surface navigates to `detailHref` via ActivityCard's
 * stretched background link; individually clickable children (avatar
 * profile, like button, permalink, comment-icon link, title link) sit
 * above it and keep their own click semantics.
 */
export function CatalogListCard({
  id,
  fen,
  title,
  description,
  createdAt,
  profile,
  likeMeta,
  replyMeta,
  detailHref,
  commentHref = detailHref,
  i18nNamespace,
  toggleLikeAction,
  justNowLabel,
  locale,
  topicKey,
  badge,
  meta,
  actions,
}: Props) {
  const displayName = resolveDisplayName(profile);
  const descriptionExcerpt = truncate(description);

  return (
    <ActivityCard
      variant="card"
      href={detailHref}
      locale={locale}
      thumbnail={<ThemedBoardThumbnail fen={fen} className="w-full h-full" />}
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
          <time dateTime={createdAt.toISOString()}>
            {formatRelativeTime(createdAt, locale, justNowLabel)}
          </time>
        </Link>
      }
      footer={
        <>
          <PostFooter
            postId={id}
            locale={locale}
            topicKey={topicKey}
            likeMeta={likeMeta}
            replyMeta={replyMeta}
            toggleLikeAction={toggleLikeAction}
            i18nNamespace={i18nNamespace}
            postHref={commentHref}
          />
          {actions && <div className="flex items-center gap-2 mt-2">{actions}</div>}
        </>
      }
    >
      <div className="flex items-center gap-2 mt-2 min-w-0">
        <h3 className="font-medium text-foreground truncate">
          <Link
            href={detailHref}
            locale={locale}
            className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {title}
          </Link>
        </h3>
        {badge}
      </div>
      {meta && <div className="mt-1.5">{meta}</div>}
      {descriptionExcerpt && (
        <p className="text-sm text-muted-foreground line-clamp-2">{descriptionExcerpt}</p>
      )}
    </ActivityCard>
  );
}
