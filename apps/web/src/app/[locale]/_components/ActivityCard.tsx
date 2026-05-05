import { type ReactNode, memo } from 'react';

import { Link } from '@/i18n/routing';

type Variant = 'feed' | 'card';

type Props = {
  /**
   * - `feed` (default): no border, sits inline in a list separated only by
   *   `border-b` on its container (e.g. the home feed).
   * - `card`: a self-contained card with rounded border and `bg-card`,
   *   appropriate for stand-alone list pages (topics, profile, etc.).
   */
  variant?: Variant;
  /**
   * Square thumbnail rendered on the left column (~80–96 px). Optional —
   * surfaces that already provide topic context elsewhere on the page
   * (e.g. topics list pages that render the opening board / square
   * highlight at the top of the page) can omit it; the right column then
   * occupies the full width.
   */
  thumbnail?: ReactNode;
  /** Extra classes appended to the thumbnail wrapper (e.g. centering icons). */
  thumbnailClassName?: string;
  /**
   * Author header — typically `<UserAvatar profileHref={...} ... />`. An
   * Activity Card without an actor is just a content card; use a different
   * primitive in that case.
   */
  author: ReactNode;
  /**
   * Optional permalink anchor (typically `<time/>` wrapped in `<Link>`)
   * shown directly under the author. Acts as the keyboard-accessible
   * permanent link; mouse users can also click anywhere on the card via
   * the `href`-driven background link (see below).
   */
  permalink?: ReactNode;
  /**
   * Footer block shown at the bottom of the right column. Typically
   * `<PostFooter />` (likes + comment summary) or a simpler `<LikeButton />`.
   */
  footer?: ReactNode;
  /**
   * Body content — badges, body text, rating, etc. Rendered between the
   * permalink and the footer.
   */
  children?: ReactNode;
  /**
   * When provided, the entire card surface becomes a click target that
   * navigates to this URL. Implemented as an absolutely-positioned <Link>
   * sitting behind the visible content (z-0) — the "stretched link"
   * pattern used by Twitter/Mastodon/GitHub feed items. Individually
   * clickable children (avatar profile link, LikeButton, embedded URLs
   * in <LinkedText>, the visible permalink anchor) sit above it via
   * `relative z-10` and keep working unchanged.
   *
   * The background link is `aria-hidden` and removed from the tab
   * order — keyboard and screen-reader users use the visible permalink
   * Link in the `permalink` slot, which carries the semantic
   * <a href> for SEO and a11y.
   *
   * Pass `null`/`undefined` for cards with no whole-card destination
   * (e.g. a position-feed entry whose detail page does not exist yet).
   */
  href?: string | null;
  /** Locale forwarded to the background link (and to next-intl). */
  locale?: string;
};

export const ActivityCard = memo(function ActivityCard({
  variant = 'feed',
  thumbnail,
  thumbnailClassName,
  author,
  permalink,
  footer,
  children,
  href,
  locale,
}: Props) {
  const baseFlex = 'flex gap-4 p-4';
  const variantClass = variant === 'card' ? ' rounded-md border border-border bg-card' : '';
  // Hover affordance only when the card is whole-clickable. Without a
  // background link, hover would be misleading — there's nothing to click.
  const hoverClass = href
    ? variant === 'card'
      ? ' hover:border-foreground/20 transition-colors'
      : ' hover:bg-muted/50 transition-colors'
    : '';
  const positioning = href ? ' relative' : '';
  const className = `${baseFlex}${variantClass}${hoverClass}${positioning}`;

  // When `href` is set, the right column wraps in a layer that is
  // visually above the stretched background link (`relative z-10`) but
  // is transparent to pointer events (`pointer-events-none`). Clicks on
  // plain text (titles, body, badges, replier avatars) fall through to
  // the background link → whole-card navigation. Inline `<a>` and
  // `<button>` descendants opt back in via `[&_a]:pointer-events-auto`
  // / `[&_button]:pointer-events-auto`, so the avatar profile link, the
  // permalink anchor, the LikeButton, and any embedded URLs in
  // <LinkedText> body content still work as their own click targets.
  const rightColumnClass = href
    ? 'flex-1 min-w-0 flex flex-col gap-1 relative z-10 pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto'
    : 'flex-1 min-w-0 flex flex-col gap-1';

  return (
    <div className={className}>
      {href && (
        <Link
          href={href}
          locale={locale}
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 z-0"
        />
      )}
      {thumbnail && (
        <div
          className={`w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 ${thumbnailClassName ?? ''}`.trim()}
        >
          {thumbnail}
        </div>
      )}
      <div className={rightColumnClass}>
        {author}
        {permalink && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">{permalink}</div>
        )}
        {children}
        {footer}
      </div>
    </div>
  );
});
