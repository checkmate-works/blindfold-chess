import type { CoinSvgData } from "./types";

/**
 * Coin icon — a 和同開珎-style silhouette: a golden disc with a square
 * hole punched through its centre, no inscription. Used by the points
 * ("Coin") UI.
 *
 * Drawn as a single `evenodd`-filled path: the outer circle subpath plus
 * the inner square subpath, so the square is rendered as a real
 * transparent hole (whatever is behind the icon shows through, so it
 * reads correctly on both light and dark themes). The same path is
 * stroked to give the disc and the hole a slightly darker golden rim.
 */
const GOLD_FILL = "#FFD95C";
const GOLD_RIM = "#CF9A28";

export const coinData: CoinSvgData = {
  viewBox: "0 0 24 24",
  elements: [
    {
      type: "path",
      d: "M12 1.5A10.5 10.5 0 1 0 12 22.5A10.5 10.5 0 1 0 12 1.5ZM8.5 8.5H15.5V15.5H8.5Z",
      fill: GOLD_FILL,
      fillRule: "evenodd",
      stroke: GOLD_RIM,
      strokeWidth: "1",
      strokeLinejoin: "round",
    },
  ],
};
