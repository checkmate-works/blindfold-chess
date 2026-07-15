import type { ReactNode } from 'react';

type Props = {
  /** Extra classes merged onto the frame (e.g. `relative` for overlay anchors). */
  className?: string;
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
export function BoardFrame({ className, children }: Props) {
  return <div className={`mx-auto w-full max-w-md ${className ?? ''}`}>{children}</div>;
}
