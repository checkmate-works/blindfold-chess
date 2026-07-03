/**
 * SAN completeness detection: decides whether a partially-typed move string
 * already denotes a complete SAN move (no further suggestions needed).
 * Split from the suggestion generator — validating completeness and
 * generating candidates are separate concerns, and this validator is
 * independently useful for input validation.
 */

// Pre-compiled patterns for complete move detection
const INCOMPLETE_PAWN_PROMOTION = /^[a-h][18]$/;
const INCOMPLETE_PAWN_CAPTURE_PROMOTION = /^[a-h]x[a-h][18]$/;

// Shared building blocks. Each `COMPLETE_MOVE_PATTERNS` entry is of the form
// `^<body>(\+|#)?$` — the anchors and optional check/mate suffix are identical
// across every pattern, so they are extracted once here. The `body` portion
// encodes the structural shape of the move (pawn push, piece move, capture,
// disambiguation, promotion, etc.) and is the only part that varies.
const PIECE = '[KQRBN]';
const FILE = '[a-h]';
const RANK = '[1-8]';
const PAWN_NON_PROMO_RANK = '[2-7]';
const PROMO_PIECE = '[QRBN]';
const CHECK_OR_MATE_SUFFIX = '(\\+|#)?';

/**
 * Build the fully anchored regex for a complete-move pattern body.
 * The body is wrapped with `^...(\+|#)?$` so callers only need to
 * describe the structural shape of the move.
 *
 * Exported for unit testing; treat as internal outside of tests.
 */
export const buildCompletePattern = (body: string): RegExp =>
  new RegExp(`^${body}${CHECK_OR_MATE_SUFFIX}$`);

const COMPLETE_MOVE_PATTERN_BODIES: readonly string[] = [
  // Pawn moves (not to promotion rank): e4, e4+, e4#
  `${FILE}${PAWN_NON_PROMO_RANK}`,
  // Pawn captures (not to promotion rank): exd5, exd5+
  `${FILE}x${FILE}${PAWN_NON_PROMO_RANK}`,
  // Pawn promotion: e8=Q, e8=Q+
  `${FILE}${RANK}=${PROMO_PIECE}`,
  // Pawn capture promotion: exd8=Q
  `${FILE}x${FILE}${RANK}=${PROMO_PIECE}`,
  // Piece moves: Nf3, Qd4+
  `${PIECE}${FILE}${RANK}`,
  // Piece captures: Nxe5, Qxd4#
  `${PIECE}x${FILE}${RANK}`,
  // Disambiguated by file: Nbd2, Rad1+
  `${PIECE}${FILE}${FILE}${RANK}`,
  // Disambiguated by rank: N1d2, R1a1#
  `${PIECE}${RANK}${FILE}${RANK}`,
  // Fully disambiguated: Nb1d2
  `${PIECE}${FILE}${RANK}${FILE}${RANK}`,
  // Disambiguated captures: Nbxd2
  `${PIECE}${FILE}x${FILE}${RANK}`,
  // Nfxe5, R1xd1
  `${PIECE}${RANK}x${FILE}${RANK}`,
  // Nb1xe5
  `${PIECE}${FILE}${RANK}x${FILE}${RANK}`,
];

const COMPLETE_MOVE_PATTERNS: readonly RegExp[] =
  COMPLETE_MOVE_PATTERN_BODIES.map(buildCompletePattern);

/**
 * Check if input looks like a complete move
 */
export function isCompleteMove(input: string): boolean {
  // Castling
  if (input === 'O-O' || input === 'O-O-O') return true;

  // Special case: pawn moves to promotion rank without promotion piece
  // These are incomplete and need suggestions
  if (INCOMPLETE_PAWN_PROMOTION.test(input) || INCOMPLETE_PAWN_CAPTURE_PROMOTION.test(input)) {
    return false;
  }

  return COMPLETE_MOVE_PATTERNS.some((pattern) => pattern.test(input));
}
