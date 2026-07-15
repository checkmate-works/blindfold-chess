'use client';

import type { ReactNode } from 'react';

type Props = {
  /** DOM id for hash-anchor scrolling (e.g. `post-123`, `game-comment-123`). */
  id: string;
  /**
   * Collapse toggle, rendered only for thread roots. `ariaLabel` is the
   * label for the CURRENT state's action (expand when collapsed, collapse
   * when expanded) — the consumer resolves it since i18n namespaces differ
   * per thread kind.
   */
  toggle?: {
    isCollapsed: boolean;
    onToggle: () => void;
    ariaLabel: string;
  };
  /**
   * The header (avatar + timestamp, or a deleted-comment tombstone) and the
   * body (text / edit form / "N replies hidden" note). Grouped tightly —
   * they read as one unit.
   */
  children: ReactNode;
  /** The like / reply / edit / delete affordance row. */
  actions?: ReactNode;
  /** The inline reply form, while open. */
  replyForm?: ReactNode;
  /**
   * Already-mapped nested reply nodes. Pass a falsy value (not an empty
   * array) when there are none, or the indented container renders empty.
   */
  replies?: ReactNode;
};

/**
 * Layout skeleton for one node in a comment thread. It owns every structural
 * spacing value so the comment trees scattered across the app (topics,
 * chunks, repertoires, position-memory, puzzle, shared-game discussion) stay
 * in visual sync:
 *
 * - `gap-3` between the collapse toggle and the content column, so the
 *   toggle and the avatar are out of mis-tap range of each other.
 * - `space-y-2` inside the header/body group ({@link Props.children}).
 * - `space-y-6` between that group and the action row / reply form / nested
 *   replies — ≈ the body's own paragraph line spacing (`text-sm` ×
 *   `leading-relaxed` ≈ 1.42rem), and wide enough to keep the like button
 *   clear of both the body's links and the next comment's avatar.
 * - `border-l-2 pl-4 space-y-4` on the nested-replies container. The gap
 *   above it comes from the column's `space-y-6` — do NOT reintroduce
 *   `mt-*` on slot contents; the `space-y` selector outranks single-class
 *   margins and silently swallows them.
 */
export function CommentNodeLayout({ id, toggle, children, actions, replyForm, replies }: Props) {
  return (
    <div id={id} className="scroll-mt-20">
      <div className="flex items-start gap-3">
        {toggle && (
          <button
            type="button"
            onClick={toggle.onToggle}
            aria-label={toggle.ariaLabel}
            aria-expanded={!toggle.isCollapsed}
            className="flex-shrink-0 mt-1 w-5 h-5 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground border border-border rounded cursor-pointer"
          >
            {toggle.isCollapsed ? '+' : '−'}
          </button>
        )}

        <div className="flex-1 min-w-0 space-y-6">
          <div className="space-y-2">{children}</div>

          {actions}

          {replyForm}

          {replies && <div className="border-l-2 border-border pl-4 space-y-4">{replies}</div>}
        </div>
      </div>
    </div>
  );
}
