import { StaticPositionBoard } from './_shared/StaticPositionBoard';
import { fenToStaticPlacements } from './_shared/fen-to-static-placements';
import { PAWN_BREAKTHROUGH_FEN } from './pawn-breakthrough-fen';

/**
 * Three white pawns facing three black pawns, kings tucked away on the kingside.
 * Used on the 1kyu guide as an endgame pattern that pays to memorise: the shape
 * alone tells you white promotes by force, so it costs no calculation to
 * recognise over a mental board.
 *
 * Derived from {@link PAWN_BREAKTHROUGH_FEN} (rather than a hand-written
 * placement list) so the board and the guide's move-reference line — which
 * replays from the same FEN — can never drift apart. Placements are computed at
 * module scope inside this client component; `fenToStaticPlacements` must not be
 * called from a Server Component.
 */
const PLACEMENTS = fenToStaticPlacements(PAWN_BREAKTHROUGH_FEN);

type Props = {
  className?: string;
};

export function PawnBreakthroughBoard({ className }: Props) {
  return <StaticPositionBoard placements={PLACEMENTS} className={className} />;
}
