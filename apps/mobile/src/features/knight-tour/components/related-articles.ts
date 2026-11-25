import type { PieceType } from "@blindfold-chess/types";

/**
 * The web's two "Related Articles" cards on the setup page, which its result
 * page lists again under "Related Learning": the tour itself, then the
 * knight's movement.
 */
export const RELATED_ARTICLES = ["knight-tour", "knight-movement"] as const;

/** The knight the web's cards draw (♞ / ♘), on both rows. */
export const RELATED_ARTICLE_PIECES: Readonly<Record<string, PieceType>> = {
  "knight-tour": "n",
  "knight-movement": "n",
};
