import type { BoardThemeColors } from "@blindfold-chess/types";

/** The colours a practice card's example is laid on. */
export type CardGround = {
  /** The band behind the example. */
  readonly fill: string;
  /** The frame round a preview board, so it does not melt into the band. */
  readonly frame: string;
};

/** `a` with `t` (0–1) of `b` mixed in, both `#rrggbb`. */
export function mixHex(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number) =>
    parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(channel(a, i) * (1 - t) + channel(b, i) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/**
 * Share of the board's dark square mixed into the dark card for the band:
 * enough to read as the board's colour, little enough that the band stays a
 * dark surface the white tiles and pieces stand out on.
 */
const DARK_GROUND_SHARE = 0.3;

/**
 * The band a practice card's example sits on: the player's board, the way
 * a mahjong card lays its tiles on the table's felt.
 *
 * @description
 * On the light scheme the band is the board theme's light square, so every
 * card's example is laid on the same wood (or cream, or stone) as the
 * boards the practices are played on, and changing the board theme changes
 * the cards with it. A neutral grey was tried before and read as a sunken
 * field — the meaning `colors.background` has everywhere else in the app.
 *
 * The light square would glare on the dark scheme, so there the band is the
 * dark card with some of the dark square mixed in.
 *
 * A preview board's own light squares are the band's colour on the light
 * scheme, so its edge is drawn in the dark square (`frame`).
 */
export function cardGround(
  board: BoardThemeColors,
  isDark: boolean,
  card: string,
): CardGround {
  return {
    fill: isDark ? mixHex(card, board.dark, DARK_GROUND_SHARE) : board.light,
    frame: board.dark,
  };
}
