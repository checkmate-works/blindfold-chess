import type { ReactNode } from 'react';

type Props = {
  /**
   * Placeholder for what a topic renders between the author line and the
   * body — an opening post shows its preference and proficiency ratings
   * there, a square post nothing.
   */
  afterHeader?: ReactNode;
};

/**
 * Placeholder for the post itself on a post-detail `loading.tsx`: avatar,
 * name/date lines, three body lines and the like button.
 *
 * The opening and square post-detail loading states drew this card
 * identically apart from the rating block; that is the slot.
 */
export function PostCardSkeleton({ afterHeader }: Props) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg space-y-4">
      <div className="flex items-start gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-48 bg-muted rounded" />
        </div>
      </div>
      {afterHeader}
      {/* Post body */}
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-11/12" />
        <div className="h-4 bg-muted rounded w-4/5" />
      </div>
      {/* Like + (maybe) delete button */}
      <div className="flex items-center gap-4 animate-pulse">
        <div className="h-8 w-20 bg-muted rounded" />
      </div>
    </div>
  );
}
