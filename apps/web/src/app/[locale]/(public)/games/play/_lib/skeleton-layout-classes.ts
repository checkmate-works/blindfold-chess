/**
 * Layout class strings shared between the in-progress game UI and its
 * route-segment loading skeletons. Defined here as constants — not as a
 * component or hook — so that imports stay tree-shakable and zero-cost,
 * while still preventing the skeleton from drifting out of sync with the
 * real layout. Each constant carries an inline comment naming the real
 * call site that owns the design; if you change either side, change the
 * constant and both sides update together.
 */

/**
 * Outer wrapper for the Undo / Resign / (optional) Show Board action row
 * rendered by `GameInProgressPanel`. The corresponding placeholder lives in
 * `ActionRowSkeleton`. Both must use the same flex/gap/justify classes so
 * the hand-off from SSR loading.tsx to the hydrated panel is CLS-free at
 * every breakpoint.
 */
export const ACTION_ROW_CONTAINER_CLASSES = 'flex justify-center gap-4 md:gap-2';

/**
 * Outer card chrome for `InlineBoardView` (and the matching
 * `InlineBoardHeaderSkeleton` / `AlwaysVisibleBoardSkeleton`). A bordered
 * card with rounded corners that clips its descendants — used identically
 * by both the peek-inline accordion and the always-visible board so they
 * share a unified visual identity.
 */
export const INLINE_BOARD_CARD_CHROME = 'bg-card rounded-md border border-border overflow-hidden';

/**
 * The accordion-trigger row inside `InlineBoardView` (peek+inline mode).
 * Shared with `InlineBoardHeaderSkeleton` so the placeholder height tracks
 * any future tweak to padding / text size. The real header layers
 * `text-left hover:bg-muted transition-colors` on top — interactivity-only
 * classes that the skeleton intentionally omits.
 */
export const INLINE_BOARD_HEADER_CHROME = 'w-full flex items-center justify-between px-4 py-3';

/**
 * Defensive minimum height for `InlineBoardHeaderSkeleton`. The skeleton's
 * placeholder bars are 16px tall while the real header's `text-sm` content
 * renders at ~22px, so the natural intrinsic height differs from the real
 * UI by ~6px. This min-h pins the skeleton to the real-UI height to keep
 * the SSR-to-hydration handoff CLS-free; if you change the real header's
 * font size or padding, recompute this value or extract a shared sizing
 * primitive.
 */
export const INLINE_BOARD_HEADER_MIN_H = 'min-h-[46px]';
