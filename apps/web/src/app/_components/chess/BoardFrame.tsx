import type { ReactNode } from 'react';

type Props = {
  /** Extra classes merged onto the frame (e.g. `relative` for overlay anchors). */
  className?: string;
  /**
   * Escape the surrounding `p-4` gutter on mobile (lichess-style full bleed).
   * `PagePanel` cancels the page gutter with `-mx-4` but re-adds its own
   * `p-4`, so a plain frame tops out 32px short of the screen edge. This
   * applies the same `-mx-4 sm:mx-0` counter-margin used by
   * `INLINE_BOARD_CARD_CHROME` / `PieceCoordinateInput`, so the board runs
   * edge-to-edge below `sm` and reverts to the centered `max-w-md` frame
   * from `sm` up. Only valid directly inside a `p-4`-padded container
   * (`PagePanel` on mobile); anywhere else it overflows by 32px.
   */
  expandOnMobile?: boolean;
  children: ReactNode;
};

/**
 * Shared width frame for a full-size chess board.
 *
 * Every board primitive (`BoardLayout`, `ChessBoard`, `AnimatedChessBoard`,
 * `BoardThumbnail`, …) renders at `w-full aspect-square`, so the *frame*
 * around it is what decides the visible size. Historically each feature
 * hand-rolled that wrapper and the values drifted (`max-w-xs` vs `max-w-md`),
 * which made boards render at 320px — visibly narrow — on phones. This
 * component pins the convention in one place:
 *
 * - `max-w-md` (448px): wider than any common phone viewport, so the board
 *   fills the content width on mobile — matching the diagonal-quiz /
 *   route-planner treatment — while staying a sane size inside desktop panels.
 * - `mx-auto w-full`: centered in wide parents, full width in narrow ones,
 *   with no need for an extra `flex justify-center` wrapper.
 *
 * Usage: wrap the board where a feature shows ONE primary board (detail
 * pages, result screens, previews, form editors). Do NOT use it for board
 * thumbnails in cards / lists (those are sized by their card), nor for the
 * lichess-style edge-to-edge play boards that use `-mx-4 sm:mx-0` chrome
 * (see `INLINE_BOARD_CARD_CHROME`).
 *
 * `EditableChessBoard` frames its own board internally (its palettes share
 * the column), so call sites render it bare — without a `BoardFrame`.
 */
/**
 * The frame's own classes, for the boards that cannot render `BoardFrame`
 * itself: the dojo visual aids take a `className` prop whose contract is to
 * REPLACE the frame (the rank Tips card passes `mx-auto max-w-[10rem]` to get
 * a thumbnail), so they need the default as a string rather than as a wrapper
 * component. Exported so those defaults still resolve to this file — the
 * whole point of the component is that the numbers live in one place, and
 * they had drifted to `max-w-xs` precisely by being retyped elsewhere.
 */
export const BOARD_FRAME_CLASS = 'mx-auto w-full max-w-md';

/**
 * `expandOnMobile` as a class string. Same caveat as the prop: only valid
 * directly inside a `p-4`-padded container, which for prose surfaces means
 * `PagePanel` on mobile.
 */
export const BOARD_FRAME_EXPAND_ON_MOBILE_CLASS =
  '-mx-4 self-stretch sm:mx-auto sm:w-full sm:max-w-md';

/**
 * The board's own corner radius when it is full-bleed on mobile — the other
 * half of `expandOnMobile`, to be passed to `BoardLayout` / `ChessBoard` /
 * `MiniBoard`'s `rounded`.
 *
 * A board that runs to both screen edges must square its corners there, the
 * way every other full-bleed surface does (`PagePanel`, `BoardModal`,
 * `INLINE_BOARD_CARD_CHROME` are all `rounded-none sm:rounded-*`): a rounded
 * corner against the screen edge shows a notch of page background and reads
 * as a card that failed to fit, not as a board. Keeping it beside the frame
 * classes is what makes the pair hard to apply by halves — which is how
 * `topics/squares` and the dojo visual aids ended up full-bleed with 6px
 * corners while the coordinate-quiz board next to them had none.
 *
 * Boards that are NOT full-bleed keep their default radius: an attachment
 * card's `MiniBoard` sits inside a padded card, where square corners would be
 * the odd ones out.
 */
export const BOARD_RADIUS_EXPAND_ON_MOBILE = 'rounded-none sm:rounded-md';

export function BoardFrame({ className, expandOnMobile = false, children }: Props) {
  // The expand variant drops `w-full` (a percentage width would ignore the
  // negative margins), so inside `items-center` flex columns it must force
  // `self-stretch` or it shrink-wraps to zero width.
  const frame = expandOnMobile ? BOARD_FRAME_EXPAND_ON_MOBILE_CLASS : BOARD_FRAME_CLASS;
  return <div className={`${frame} ${className ?? ''}`}>{children}</div>;
}
