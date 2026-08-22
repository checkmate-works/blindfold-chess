/**
 * The closed vocabulary of coaching principles a review can attach to a
 * critical moment.
 *
 * A moment's `lesson` used to be free prose that mixed two things: what this
 * game's position asked for, and the general rule it illustrates ("in open
 * games, prefer central control"). The general rule is not something the
 * model should author per review — it is the same rule every time, it is
 * worth showing in the reader's language regardless of the review's, and it
 * is what a player wants counted across games ("which principle do I keep
 * breaking?"). So the rule is picked from this list, by id, the way a moment
 * is picked by `ply`: the provider-side schema pins the enum, zod re-checks
 * it, and the prose is left to say how the principle applied HERE.
 *
 * Each principle is also a glossary term (`glossarySlug`), which is where
 * its display name and definition live — in the reader's language, with a
 * page of its own the review can link to; `meaning` here is the English
 * gloss the model reads when choosing. `other` is the escape hatch for a
 * moment none of these fit — the UI renders no principle for it, and a
 * review that uses it often is a sign the list needs an entry.
 */

export type Principle = {
  id: string;
  /**
   * The glossary term that IS this principle (`glossary_terms.slug`, seeded
   * from `@/lib/db/data/terms/principles.ts`). Display name and definition
   * live there, in the reader's language; absent only on `other`.
   */
  glossarySlug?: string;
  /** One line, in English, for the model's catalogue. */
  meaning: string;
  /** Applies only to play without full sight of the board. */
  blindfold?: true;
};

export const PRINCIPLES = [
  // General chess.
  {
    id: 'develop_before_attacking',
    glossarySlug: 'develop-before-attacking',
    meaning:
      'Bring the minor pieces out and castle before the queen goes hunting or an attack starts.',
  },
  {
    id: 'king_safety_first',
    glossarySlug: 'king-safety-first',
    meaning:
      'Keep the king safe before chasing material or activity; do not loosen its pawn shelter without need.',
  },
  {
    id: 'count_attackers_and_defenders',
    glossarySlug: 'count-attackers-and-defenders',
    meaning: 'Before a capture or a fight for a square, count the attackers and the defenders.',
  },
  {
    id: 'check_opponent_threats',
    glossarySlug: 'check-the-opponents-threats',
    meaning:
      "Before every move, ask what the opponent's last move threatens — checks and captures first.",
  },
  {
    id: 'dont_grab_poisoned_material',
    glossarySlug: 'dont-grab-poisoned-material',
    meaning:
      'Do not take material that costs tempi, exposes the king, or is won back with interest.',
  },
  {
    id: 'keep_central_control',
    glossarySlug: 'keep-central-control',
    meaning:
      'Fight for the center; do not release or lock it without a plan that the closed structure serves.',
  },
  {
    id: 'dont_move_the_same_piece_twice',
    glossarySlug: 'dont-move-the-same-piece-twice',
    meaning: 'In the opening, do not move the same piece twice while others are still at home.',
  },
  {
    id: 'improve_the_worst_piece',
    glossarySlug: 'improve-the-worst-piece',
    meaning:
      'When nothing is forced, improve the least active piece instead of making a move for its own sake.',
  },
  {
    id: 'mind_the_pawn_structure',
    glossarySlug: 'mind-the-pawn-structure',
    meaning:
      'Pawn moves are permanent: do not create weak squares or weak pawns without getting something for them.',
  },
  {
    id: 'keep_pieces_protected',
    glossarySlug: 'keep-pieces-protected',
    meaning:
      'Loose pieces drop off — keep pieces defended, and notice when a move leaves one hanging.',
  },
  {
    id: 'trade_when_ahead',
    glossarySlug: 'trade-when-ahead',
    meaning:
      'When ahead in material, trade pieces and simplify; when behind, keep pieces on and seek complications.',
  },
  {
    id: 'activate_the_rooks',
    glossarySlug: 'activate-the-rooks',
    meaning: 'Put rooks on open files and the seventh rank; connect them early.',
  },
  {
    id: 'calculate_forcing_moves_first',
    glossarySlug: 'calculate-forcing-moves-first',
    meaning:
      'In a sharp position, calculate checks, captures, and threats — for both sides — before anything else.',
  },
  {
    id: 'convert_patiently',
    glossarySlug: 'convert-patiently',
    meaning:
      'In a winning position, avoid risk: consolidate, remove counterplay, and convert step by step.',
  },
  {
    id: 'activate_the_king_in_the_endgame',
    glossarySlug: 'activate-the-king-in-the-endgame',
    meaning:
      'Once the queens are off, the king is a fighting piece — bring it toward the center and the pawns.',
  },
  // Blindfold play.
  {
    id: 'recount_after_captures',
    glossarySlug: 'recount-after-captures',
    meaning:
      'After every capture, pawn move, or check, re-verify where the affected pieces stand before thinking further.',
    blindfold: true,
  },
  {
    id: 'verify_the_piece_before_committing',
    glossarySlug: 'verify-the-piece-before-committing',
    meaning:
      'Before submitting a move, confirm the square the moving piece is really on and that its path is clear.',
    blindfold: true,
  },
  {
    id: 'checkpoint_at_structural_changes',
    glossarySlug: 'checkpoint-at-structural-changes',
    meaning:
      'Spend a peek or a deliberate full recount at structural changes — captures, pawn breaks, king moves — not per move.',
    blindfold: true,
  },
  {
    id: 'track_both_kings',
    glossarySlug: 'track-both-kings',
    meaning:
      'Keep the squares around both kings in mind at all times; most blindfold blunders start there.',
    blindfold: true,
  },
  {
    id: 'narrate_the_position_periodically',
    glossarySlug: 'narrate-the-position-periodically',
    meaning:
      'Every few moves, recite the full position piece by piece to refresh the mental board before it fades.',
    blindfold: true,
  },
  { id: 'other', meaning: 'None of the listed principles fits this moment.' },
] as const satisfies readonly Principle[];

export type PrincipleId = (typeof PRINCIPLES)[number]['id'];

export const PRINCIPLE_IDS = PRINCIPLES.map((p) => p.id) as [PrincipleId, ...PrincipleId[]];

/** The glossary slug behind a principle, or null for `other`. */
export function glossarySlugOf(id: PrincipleId): string | null {
  return (PRINCIPLES.find((p) => p.id === id) as Principle | undefined)?.glossarySlug ?? null;
}

/** Every principle's glossary slug — what a page embeds so the links can open the modal. */
export const PRINCIPLE_GLOSSARY_SLUGS: string[] = PRINCIPLES.flatMap((p: Principle) =>
  p.glossarySlug ? [p.glossarySlug] : []
);

export function isPrincipleId(value: unknown): value is PrincipleId {
  return typeof value === 'string' && (PRINCIPLE_IDS as readonly string[]).includes(value);
}
