import {
  BELT_COLOR_HEX,
  MUKYU_SLUG,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import type { ThemeColors } from "../../theme";

/** The colours one belt is drawn in. */
export type BeltColors = {
  /** The belt itself: the badge, an earned segment of the ladder. */
  readonly fill: string;
  /**
   * A faint, opaque wash of the belt colour: the goal's segment of the
   * ladder, the face of a belt button, the cell of the stage in progress.
   */
  readonly tint: string;
  /** Text and glyphs drawn on `tint` (and on `tintPressed`). */
  readonly tintText: string;
  /** `tint` while a belt button is held down. */
  readonly tintPressed: string;
  /** What text or a glyph on `fill` is drawn in. */
  readonly onFill: string;
  /**
   * The outline the badge needs to stay visible: mukyu is white on a light
   * card, and 1dan is near-black on a dark one.
   */
  readonly outline: string;
};

/** The wash of one belt in one colour scheme. */
export type BeltTint = {
  readonly tint: string;
  readonly tintText: string;
  readonly tintPressed: string;
};

/**
 * The wash of every belt, for light and dark cards.
 *
 * @description
 * The wash cannot be the belt colour at a low opacity with white text on
 * it: the 3kyu belt is yellow and the unranked belt white, so a pale face
 * with white letters would be unreadable. Each belt therefore picks its own
 * text colour, a dark shade of the belt on the light scheme and a light
 * shade on the dark one, and every pair (text on `tint`, text on
 * `tintPressed`) keeps a contrast ratio of at least 4.5:1 — `belt.test.ts`
 * checks every entry. The unranked belt is a neutral grey, since a white
 * wash would not read as a colour at all. The 1dan wash on the dark scheme
 * is lighter than the card, so its near-black belt outline still shows.
 *
 * Typed as a `Record` over every slug, so a rank added to the ladder does
 * not compile until it has a wash.
 */
export const BELT_TINTS: Readonly<
  Record<RankSlug, { readonly light: BeltTint; readonly dark: BeltTint }>
> = {
  mukyu: {
    light: { tint: "#ececec", tintText: "#404040", tintPressed: "#dcdcdc" },
    dark: { tint: "#3a3835", tintText: "#e5e5e5", tintPressed: "#4a4743" },
  },
  "5kyu": {
    light: { tint: "#ffedd5", tintText: "#9a3412", tintPressed: "#fed7aa" },
    dark: { tint: "#431407", tintText: "#fdba74", tintPressed: "#5c1d0a" },
  },
  "4kyu": {
    light: { tint: "#dbeafe", tintText: "#1e40af", tintPressed: "#bfdbfe" },
    dark: { tint: "#172554", tintText: "#93c5fd", tintPressed: "#1e3a8a" },
  },
  "3kyu": {
    light: { tint: "#fef9c3", tintText: "#854d0e", tintPressed: "#fef08a" },
    dark: { tint: "#422006", tintText: "#fde047", tintPressed: "#5c2e0a" },
  },
  "2kyu": {
    light: { tint: "#dcfce7", tintText: "#166534", tintPressed: "#bbf7d0" },
    dark: { tint: "#052e16", tintText: "#86efac", tintPressed: "#0f4024" },
  },
  "1kyu": {
    light: { tint: "#f3e5d8", tintText: "#78350f", tintPressed: "#e8d2bd" },
    dark: { tint: "#3d2414", tintText: "#ecc9a5", tintPressed: "#52321c" },
  },
  "1dan": {
    light: { tint: "#e7e5e4", tintText: "#1c1917", tintPressed: "#d6d3d1" },
    dark: { tint: "#44403c", tintText: "#f5f5f4", tintPressed: "#57534e" },
  },
};

/** WCAG relative luminance of a `#rrggbb` colour. */
export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Not a #rrggbb colour: ${hex}`);
  const [r, g, b] = match.slice(1).map((part) => {
    const c = parseInt(part, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** WCAG contrast ratio between two `#rrggbb` colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi! + 0.05) / (lo! + 0.05);
}

/**
 * Whether a theme is the dark one, read from its card colour, so callers
 * keep passing only the theme's colours.
 */
function isDarkTheme(colors: ThemeColors): boolean {
  return relativeLuminance(colors.card) < 0.5;
}

export function beltColors(slug: RankSlug, colors: ThemeColors): BeltColors {
  const fill = BELT_COLOR_HEX[slug];
  const tints = BELT_TINTS[slug][isDarkTheme(colors) ? "dark" : "light"];
  return {
    fill,
    ...tints,
    onFill: slug === MUKYU_SLUG ? colors.mutedForeground : "#ffffff",
    outline: colors.border,
  };
}
