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
export function BoardFrame({ className, expandOnMobile = false, children }: Props) {
  // The expand variant drops `w-full` (a percentage width would ignore the
  // negative margins), so inside `items-center` flex columns it must force
  // `self-stretch` or it shrink-wraps to zero width.
  const frame = expandOnMobile
    ? '-mx-4 self-stretch sm:mx-auto sm:w-full sm:max-w-md'
    : 'mx-auto w-full max-w-md';
  return <div className={`${frame} ${className ?? ''}`}>{children}</div>;
}
