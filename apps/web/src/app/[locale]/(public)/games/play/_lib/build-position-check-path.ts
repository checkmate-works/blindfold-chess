import { encodeFenToBase64Url } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_lib/share-url';

type BuildPositionCheckPathArgs = {
  locale: string;
  /** The live game's current position — always `currentFen`, never a scrubbed historical one. */
  fen: string;
  /**
   * The play screen's own URL, so the position-memory result screen can lead
   * back to the game. Re-validated by the session page (`sanitizeNext`).
   */
  returnTo: string;
};

/**
 * Build the mid-game position-check deep-link: an instant ("custom")
 * position-memory session over the game's current position.
 *
 * The whole problem travels in the URL (the Base64URL-encoded FEN), like any
 * other instant problem — nothing is persisted. `skipMemorize=1` because the
 * "memorize" already happened during play: the point is to test the picture
 * the player carries in their head against the real position, not to show
 * them the answer first. No aid accounting either — the result's accuracy
 * comparison reveals no more than the moves panel's free channels (Copy FEN /
 * Lichess analysis) already do.
 */
export function buildPositionCheckPath({
  locale,
  fen,
  returnTo,
}: BuildPositionCheckPathArgs): string {
  const params = new URLSearchParams();
  params.set('skipMemorize', '1');
  params.set('returnTo', returnTo);

  return `/${locale}/practice/position-memory/custom/${encodeFenToBase64Url(fen)}/session?${params.toString()}`;
}
