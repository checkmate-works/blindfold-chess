'use client';

import { StaticPositionBoard, fenToStaticPlacements } from './_shared/StaticPositionBoard';
import { TWO_PAWNS_VS_ONE_FEN } from './two-pawns-vs-one-fen';

/**
 * A minimal 2-pawns-vs-1 endgame. Used on the 1kyu guide to show what the
 * "start from a simple material edge" rung actually looks like before the
 * reader clicks through to play it against the AI.
 *
 * Derived from {@link TWO_PAWNS_VS_ONE_FEN} (rather than a hand-written
 * placement list) so this board and the guide's `games/new/position?fen=` link
 * — built from the same constant — can never show different positions.
 * Placements are computed at module scope inside this client component;
 * `fenToStaticPlacements` must not be called from a Server Component.
 */
const PLACEMENTS = fenToStaticPlacements(TWO_PAWNS_VS_ONE_FEN);

type Props = {
  className?: string;
};

export function TwoPawnsVsOneBoard({ className }: Props) {
  return <StaticPositionBoard placements={PLACEMENTS} className={className} />;
}
