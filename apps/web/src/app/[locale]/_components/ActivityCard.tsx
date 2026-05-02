import { type ReactNode, memo } from 'react';

type Variant = 'feed' | 'card';

type Props = {
  /**
   * - `feed` (default): no border, sits inline in a list separated only by
   *   `border-b` on its container (e.g. the home feed).
   * - `card`: a self-contained card with rounded border and `bg-card`,
   *   appropriate for stand-alone list pages (topics, profile, etc.).
   */
  variant?: Variant;
  /** Square thumbnail rendered on the left column (~80–96 px). */
  thumbnail: ReactNode;
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
   * shown directly under the author. Use this slot — not a whole-card
   * `<Link>` — whenever the card body contains interactive children
   * (LikeButton, embedded URLs in <LinkedText>, profile links inside
   * <UserAvatar>) so nested anchors are avoided.
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
};

export const ActivityCard = memo(function ActivityCard({
  variant = 'feed',
  thumbnail,
  thumbnailClassName,
  author,
  permalink,
  footer,
  children,
}: Props) {
  const className =
    variant === 'card'
      ? 'flex gap-4 p-4 rounded-md border border-border bg-card'
      : 'flex gap-4 p-4';

  return (
    <div className={className}>
      <div className={`w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 ${thumbnailClassName ?? ''}`.trim()}>
        {thumbnail}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
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
