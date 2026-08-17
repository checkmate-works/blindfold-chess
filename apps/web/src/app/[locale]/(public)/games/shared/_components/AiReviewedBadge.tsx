import { FaRobot } from 'react-icons/fa';

type Props = {
  /** Resolved `sharedGames.list.aiReviewedBadge`, passed in like the sibling row's labels. */
  label: string;
};

/**
 * Title-row chip marking a game whose AI review already exists, so a reader
 * scanning the gallery can tell which games come with coaching.
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
export function AiReviewedBadge({ label }: Props) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <FaRobot className="size-3" aria-hidden />
      {label}
    </span>
  );
}
