'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaEyeSlash } from 'react-icons/fa';

import { truncateContent } from '@/lib/content/truncate-content';
import type { LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';
import type { SocialAuthorProfile } from '@/lib/users/author-profile';

import { LinkedText } from '@/app/[locale]/_components';
import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import { CardAuthorAvatar } from '@/app/[locale]/_components/CardAuthorAvatar';
import { CARD_PERMALINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import type { ToggleLikeAction } from '../_lib/action-types';
import { formatRelativeTime } from '../_lib/relative-time';
import { PostFooter } from './PostFooter';

type Props = {
  postId: string;
  postHref: string;
  /**
   * Href for the comment-icon link in `PostFooter`. Defaults to `postHref`.
   * Pass a `#comments`-suffixed variant when the destination page has a
   * matching `id="comments"` target + `ScrollToHashOnMount`, so tapping the
   * comment icon lands scrolled to the Comments section instead of the top
   * of the page — mirrors `CatalogListCard`'s `commentHref`.
   */
  commentHref?: string;
  content: string;
  createdAt: Date;
  author: SocialAuthorProfile | null;
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
   * page hash anchor that does nothing visible to the reader. Topic
   * families that DO have a `/topics/[family]/[key]/posts/[postId]` page
   * (openings, squares) leave this `false` so their "Show more" continues
   * to navigate. Defaults to `false`.
   */
  expandInline?: boolean;
};

export function BaseTopicPostCard({
  postId,
  postHref,
  commentHref = postHref,
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
  const tCommon = useTranslations('Common');
  const [isRevealed, setIsRevealed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // CSS `line-clamp-3` can clip content that JS-side `truncateContent` left
  // untouched — e.g. a sub-200-char comment with multiple paragraph breaks
  // still overflows three visual lines. We measure the rendered body to
  // detect that case so "Show more" appears whenever the reader actually
  // can't see the full text.
  const [isClamped, setIsClamped] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const displayName = author?.displayName || author?.username || tCommon('deletedUser');
  const hasContent = content.length > 0;
  const contentPreview = truncateContent(content);
  const showSpoilerOverlay = isSpoiler && !isRevealed;
  const showInlineExpanded = expandInline && isExpanded;
  const bodyText = showInlineExpanded ? content : contentPreview;
  const isTruncated = contentPreview !== content || isClamped;
  const bodyId = `post-body-${postId}`;

  useEffect(() => {
    if (showInlineExpanded) {
      setIsClamped(false);
      return;
    }
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      setIsClamped(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showInlineExpanded, bodyText]);

  // Layout note (HTML / a11y): the card body MUST NOT be wrapped in a
  // top-level <a>. The body renders user-submitted content via
  // <LinkedText>, which itself emits inline <a> elements for URLs in the
  // comment text — and <a> nested inside <a> is invalid HTML and
  // produces a hydration error in React. The body also contains
  // <button>s (spoiler reveal, expand-inline) and the LikeButton in
  // PostFooter, which similarly cannot live inside an anchor.
  //
  // Whole-card click is therefore implemented by ActivityCard's
  // "stretched link" pattern: an absolutely-positioned <Link> sits at
  // z-0 behind the visible content (z-10), which wraps in a layer that
  // is transparent to pointer events. Inline <a> and <button>
  // descendants opt back in via pointer-events-auto, so the avatar
  // profile link, the permalink anchor, the spoiler overlay button,
  // the expand-inline button, and the LikeButton continue to take
  // their own clicks. The background link is `aria-hidden`/tabIndex=-1
  // so keyboard and screen-reader users navigate via the visible
  // permalink anchor (Twitter / Mastodon / GitHub pattern).
  return (
    <ActivityCard
      variant="card"
      href={postHref}
      locale={locale}
      author={<CardAuthorAvatar author={author} displayName={displayName} locale={locale} />}
      permalink={
        <Link
          href={postHref}
          locale={locale}
          className={CARD_PERMALINK_CLASSES}
          aria-label={tTopics('permalinkAriaLabel')}
        >
          <time dateTime={createdAt.toISOString()}>
            {formatRelativeTime(new Date(createdAt), locale, justNowLabel)}
          </time>
        </Link>
      }
      footer={
        <PostFooter
          postId={postId}
          locale={locale}
          topicKey={topicKey}
          likeMeta={likeMeta}
          replyMeta={replyMeta}
          toggleLikeAction={toggleLikeAction}
          i18nNamespace={i18nNamespace}
          postHref={commentHref}
        />
      }
    >
      {badge}
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
            ref={bodyRef}
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
              onClick={() => setIsRevealed(true)}
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
              onClick={() => setIsExpanded(true)}
              aria-expanded={false}
              aria-controls={bodyId}
              className={`${CARD_PERMALINK_CLASSES} self-start text-sm text-link-primary cursor-pointer`}
            >
              {tTopics('showMore')}
            </button>
          )
        ) : (
          <Link
            href={postHref}
            locale={locale}
            className={`${CARD_PERMALINK_CLASSES} self-start text-sm text-link-primary`}
          >
            {tTopics('showMore')}
          </Link>
        ))}
      {extraContent}
    </ActivityCard>
  );
}
