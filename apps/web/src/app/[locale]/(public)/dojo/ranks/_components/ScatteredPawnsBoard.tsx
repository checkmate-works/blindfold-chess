'use client';

import { StaticPositionBoard, fenToStaticPlacements } from './_shared/StaticPositionBoard';
import { SCATTERED_PAWNS_FEN } from './scattered-pawns-fen';

/**
 * A 10-pawn position with no chunkable structure, used on the 2kyu guide and
 * the 2kyu rank detail card as the "hard to memorize" example: ten isolated
 * facts that overrun working memory because they form no recognizable pattern.
 *
 * The FEN is kingless and not a legal game position, so it is rendered via the
 * chess.js-free {@link fenToStaticPlacements} rather than `ChessBoard`.
 */
const PLACEMENTS = fenToStaticPlacements(SCATTERED_PAWNS_FEN);

type Props = {
  className?: string;
};

export function ScatteredPawnsBoard({ className }: Props) {
  return <StaticPositionBoard placements={PLACEMENTS} className={className} />;
}
