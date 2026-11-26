import {
  BELT_COLOR_HEX,
  MUKYU_SLUG,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import type { ThemeColors } from "../../theme";
import { withAlpha } from "../../theme";

/** The colours one belt is drawn in. */
export type BeltColors = {
  /** The belt itself: the badge, an earned segment of the ladder. */
  readonly fill: string;
  /** A faint wash of the belt colour: the goal's segment, its card's band. */
  readonly tint: string;
  /** What text or a glyph on `fill` is drawn in. */
  readonly onFill: string;
  /**
   * The outline the badge needs to stay visible: mukyu is white on a light
   * card, and 1dan is near-black on a dark one.
   */
  readonly outline: string;
};

export function beltColors(slug: RankSlug, colors: ThemeColors): BeltColors {
  const fill = BELT_COLOR_HEX[slug];
  return {
    fill,
    tint: slug === MUKYU_SLUG ? colors.muted : withAlpha(fill, 0.18),
    onFill: slug === MUKYU_SLUG ? colors.mutedForeground : "#ffffff",
    outline: colors.border,
  };
}
