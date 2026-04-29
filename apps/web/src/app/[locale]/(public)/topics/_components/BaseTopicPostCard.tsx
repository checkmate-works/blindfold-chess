'use client';

import { type ReactNode, useState } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaEyeSlash } from 'react-icons/fa';

import { truncateContent } from '@/lib/content/truncate-content';

import { LinkedText } from '@/app/[locale]/_components';

import { formatRelativeTime } from '../_lib/relative-time';
import type { LikeMeta, ReplyMeta } from '../_lib/shared';
import { PostFooter } from './PostFooter';
import { UserAvatar } from './UserAvatar';

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type Props = {
  postId: string;
  postHref: string;
  content: string;
  createdAt: Date;
  author: {
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    flair: string | null;
    country: string | null;
  } | null;
  locale: string;
  topicKey: string;
  likeMeta: LikeMeta;
  replyMeta: ReplyMeta;
  toggleLikeAction: ToggleLikeAction;
  i18nNamespace: string;
  justNowLabel: string;
  badge?: ReactNode;
  extraContent?: ReactNode;
  /**
   * When `true`, the post body is hidden behind a click-to-reveal overlay
   * (Discord/Reddit-style) so the solution stays obscured until the reader
   * explicitly opts in. Currently set by the puzzle PostCard, where authors
   * self-flag comments that reveal the solution. Defaults to `false`.
   */
  isSpoiler?: boolean;
  /**
   * When `true`, the "Show more" affordance expands the comment inline
   * (lifts the truncate + line-clamp) instead of navigating to a post
   * detail page. Used by surfaces that have no per-post detail page —
   * currently position-memory and puzzle, where the postHref is a same-
   * page hash anchor that does nothing visible to the reader. Chunks,
   * which DO have a `/chunks/[slug]/posts/[postId]` page, leaves this
   * `false` so its "Show more" continues to navigate. Defaults to
   * `false`.
   */
  expandInline?: boolean;
};

export function BaseTopicPostCard({
  postId,
  postHref,
  content,
  createdAt,
  author,
  locale,
  topicKey,
  likeMeta,
  replyMeta,
  toggleLikeAction,
  i18nNamespace,
  justNowLabel,
  badge,
  extraContent,
  isSpoiler = false,
  expandInline = false,
}: Props) {
  const tTopics = useTranslations('topics');
  const [isRevealed, setIsRevealed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const displayName = author?.displayName || author?.username || 'Anonymous';
  const profileHref = author?.username ? `/u/${author.username}` : null;
  const hasContent = content.length > 0;
  const contentPreview = truncateContent(content);
  const isTruncated = contentPreview !== content;
  const showSpoilerOverlay = isSpoiler && !isRevealed;
  const showInlineExpanded = expandInline && isExpanded;
  const bodyText = showInlineExpanded ? content : contentPreview;
  const bodyId = `post-body-${postId}`;

  // Layout note (HTML / a11y): the card is intentionally NOT a single
  // top-level <a>. Wrapping the whole card in <Link> would force any
  // interactive children (LikeButton, AttachedGameCard's per-move
  // buttons, …) to live inside an <a>, which is invalid HTML
  // (interactive content nested in interactive content) and degrades
  // screen-reader semantics. Instead, the click-to-detail affordance
  // is scoped to the avatar / header / text region — the parts that
  // genuinely behave like a single link target — and `extraContent`
  // and `PostFooter` are rendered as siblings outside the link.
  return (
    <div className="group p-4 rounded-md border border-border bg-card hover:border-foreground/20 transition-colors">
      <Link
        href={postHref}
        locale={locale}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        <UserAvatar
          profileHref={profileHref}
          avatarUrl={author?.avatarUrl}
          displayName={displayName}
          locale={locale}
          asLink={false}
          flair={author?.flair}
          country={author?.country}
        >
          <div className="text-sm text-muted-foreground mb-4">
            <time dateTime={createdAt.toISOString()}>
              {formatRelativeTime(new Date(createdAt), locale, justNowLabel)}
            </time>
            {badge}
          </div>
          {/*
            i18n note: Japanese intentionally uses different wording for the
            writer-side toggle label (`spoiler.toggleLabel` = "解法を含む") and
            the reader-side overlay title (`spoiler.overlayTitle` =
            "ネタバレを含みます"). "ネタバレ" is the standard Japanese term for
            a reader-facing spoiler warning, while "解法を含む" reads more
            naturally as a self-declaration on the composer. Other locales
            (en/es/pt-BR) use parallel "Contains solution" wording for both
            because there is no equivalent natural-cognate distinction. Do
            NOT normalize without product input.

            a11y note: `aria-live="polite"` on the wrapper announces the
            revealed body to screen readers when the overlay is dismissed,
            so the user who clicked "reveal" hears the comment they just
            opted into.
          */}
          {hasContent && (
            <div className="relative" aria-live="polite">
              <p
                id={bodyId}
                className={
                  showInlineExpanded
                    ? 'text-sm text-foreground whitespace-pre-wrap break-words'
                    : 'text-sm text-foreground whitespace-pre-wrap break-words line-clamp-3'
                }
                aria-hidden={showSpoilerOverlay || undefined}
              >
                <LinkedText text={bodyText} locale={locale} />
              </p>
              {showSpoilerOverlay && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsRevealed(true);
                  }}
                  aria-label={tTopics('spoiler.overlayAriaLabel')}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-sm bg-muted text-muted-foreground hover:bg-muted/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <FaEyeSlash aria-hidden="true" />
                    {tTopics('spoiler.overlayTitle')}
                  </span>
                  <span className="text-xs text-muted-foreground/80">
                    {tTopics('spoiler.overlayHint')}
                  </span>
                </button>
              )}
            </div>
          )}
          {hasContent &&
            isTruncated &&
            (!isSpoiler || isRevealed) &&
            (expandInline ? (
              !isExpanded && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  aria-expanded={false}
                  aria-controls={bodyId}
                  className="text-sm text-link-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm cursor-pointer"
                >
                  {tTopics('showMore')}
                </button>
              )
            ) : (
              <span className="text-sm text-link-primary hover:underline">
                {tTopics('showMore')}
              </span>
            ))}
        </UserAvatar>
      </Link>

      {extraContent}

      <PostFooter
        postId={postId}
        locale={locale}
        topicKey={topicKey}
        likeMeta={likeMeta}
        replyMeta={replyMeta}
        toggleLikeAction={toggleLikeAction}
        i18nNamespace={i18nNamespace}
      />
    </div>
  );
}
