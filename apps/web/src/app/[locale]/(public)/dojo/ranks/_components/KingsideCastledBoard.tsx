import { StaticPositionBoard } from './_shared/StaticPositionBoard';
import { fenToStaticPlacements } from './_shared/fen-to-static-placements';
import { CASTLED_KINGSIDE_FEN } from './castled-kingside-fen';

/**
 * Both sides castled kingside with only king, rook, and f/g/h pawns
 * remaining. Used on the 2kyu guide as the chunked counterpart to
 * {@link ScatteredPawnsBoard}: the same 10 pieces collapse into two easily
 * memorable "O-O" patterns instead of ten isolated facts.
 *
 * Derived from {@link CASTLED_KINGSIDE_FEN} (rather than a hand-written
 * placement list) so the board and the guide's "solve this problem" CTA — whose
 * token is the Base64URL of the same FEN — can never drift apart. Placements
 * are computed at module scope inside this client component; `fenToStaticPlacements`
 * must not be called from a Server Component.
 */
const PLACEMENTS = fenToStaticPlacements(CASTLED_KINGSIDE_FEN);

type Props = {
  className?: string;
};

export function KingsideCastledBoard({ className }: Props) {
  return <StaticPositionBoard placements={PLACEMENTS} className={className} />;
}
