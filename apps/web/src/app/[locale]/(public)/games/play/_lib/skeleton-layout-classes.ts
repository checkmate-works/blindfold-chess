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
 * `InlineBoardHeaderSkeleton` / `AlwaysVisibleBoardSkeleton`). A card that
 * clips its descendants — used identically by both the peek-inline accordion
 * and the always-visible board so they share a unified visual identity.
 *
 * Responsive shape mirrors `PagePanel`: on mobile (`<sm`) the card goes
 * full-bleed (`-mx-4` cancels the parent locale layout's `px-4`, and PagePanel's
 * own `p-4` is cancelled too) with square corners and no border, so the board
 * reaches the screen edges — same lichess-style full-width treatment as the
 * coordinate-quiz board. At `>=sm` it becomes a bordered, rounded card again.
 * The `-mx-4` assumes the board card sits inside `PagePanel` (`p-4` at `<sm`)
 * within the `px-4` locale layout wrapper.
 */
export const INLINE_BOARD_CARD_CHROME =
  'bg-card -mx-4 sm:mx-0 rounded-none sm:rounded-md border-0 sm:border sm:border-border overflow-hidden';

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

/**
 * Shared box metrics for the centered status pills that cycle in the same spot
 * during a blindfold game: the AI-reply chip (its "thinking" and "AI played …"
 * states) and the mask labels ("Tap to reveal" / "Board hidden"). Pinning a
 * constant height + padding here means swapping between them never resizes the
 * pill — even though the "AI played …" state bumps its move notation to a
 * larger font. Each call site layers its own background / border / text colour
 * on top; only the box size is shared. `h-10` comfortably fits the `text-lg`
 * move notation (line-height 28px) within the 40px box.
 */
export const STATUS_PILL_CLASSES =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap';

/**
 * Height policy for the control strip under a board (`MoveNavigationRow`, which
 * owns the design). Boards place it directly under the board, where
 * `aspect-[8/1]` makes it exactly one rank tall — a continuation of the board
 * rather than a separate bar. On a phone that ratio resolves to ~47px, shorter
 * than the touch-sized stepper, so below `sm` the strip is sized by its content
 * instead.
 *
 * It lives here rather than beside the row because the skeletons that reserve
 * this height (`AlwaysVisibleBoardSkeleton`, the openings post's `loading.tsx`)
 * are Server Components, and `MoveNavigationRow` is a client module — a class
 * string imported across that boundary is not reliably a string in the RSC
 * pass. Everything that can render controls should render the row itself.
 */
export const MOVE_NAV_ROW_CLASS = 'min-h-14 sm:min-h-0 sm:aspect-[8/1]';
