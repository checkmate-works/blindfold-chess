import { FaRobot } from 'react-icons/fa';

type Props = {
  /** Whether this game already has an AI review. `false` renders nothing. */
  reviewed: boolean;
  /** Resolved `sharedGames.list.aiReviewedBadge`, passed in like the sibling row's labels. */
  label: string;
};

/**
 * Title-row chip marking a game whose AI review already exists, so a reader
 * scanning a list of games can tell which ones come with coaching. Rendered on
 * every surface that shows a game card — the gallery, a profile's games tab,
 * the chunk page's related games, and the home feed.
 *
 * @design The `reviewed` gate lives here, not at the call sites
 * Each surface resolves the reviewed set for its whole page in one query
 * ({@link getReviewedGameIdSet}) and hands the per-card bit to this component,
 * instead of deciding whether to pass a badge at all. With four call sites, a
 * per-site ternary is four places for the badge to drift out of sync — and the
 * failure it guards against (rendering the chip for an unreviewed game) is
 * invisible in review, since the chip looks correct either way.
 *
 * @design A title badge, not a footer avatar
 * The obvious-looking home for this is the replier avatar stack in
 * `PostFooter` — but that stack renders only when the game has comments, and
 * it means "people who reacted to this". A review is neither: it exists
 * independently of any comment, and it is a property of the game rather than
 * somebody's reaction to it. Property-of-the-entity is exactly what the card's
 * `badge` slot is for (cf. the kata chips, the members-only announcement lock).
 *
 * @design The word carries it, the robot only decorates
 * The icon never appears alone. This app pits players against Stockfish and
 * Maia, so a lone robot on a game card reads as "played against an engine" —
 * which is true of nearly every game here and is not what this marks.
 */
export function AiReviewedBadge({ reviewed, label }: Props) {
  if (!reviewed) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <FaRobot className="size-3" aria-hidden />
      {label}
    </span>
  );
}
