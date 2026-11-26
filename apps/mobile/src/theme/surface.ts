import type { ThemeColors } from "@blindfold-chess/ui";

/**
 * Surface colors: the app-only colors that paint the page and the panels on
 * it, merged by `ThemeProvider` into `useTheme().colors` on top of the shared
 * `@blindfold-chess/ui` palette.
 *
 * @description
 * The app's look is "flat", and these tokens exist to express that rule:
 *
 * - The page behind every screen is white (`page`).
 * - A panel (card, list, bottom bar) is white with a 1px pale border
 *   (`panelBorder`); rows inside it are split by an even paler full-width
 *   line (`rowSeparator`).
 * - A panel laid on the page casts no shadow.
 * - While pressed, a control changes only its fill (`primaryPressed` for the
 *   primary button) — never its position or its opacity.
 *
 * What makes the look is the rule, not a palette: the brand colors stay the
 * ones shared with the web app, so the two apps do not drift apart in hue.
 *
 * Why here and not in `@blindfold-chess/ui`: the shared palette also feeds
 * the web app's CSS custom properties through `generateThemeCSS()`, so adding
 * these keys there would put values the web never uses into the web's source
 * of truth for its look. Merging them on the app side keeps every existing
 * `useTheme().colors.*` call working unchanged. Overwriting
 * `lightColors.background` with white instead was rejected — see `page`.
 *
 * Dark values are kept even though the app is light-only
 * (`userInterfaceStyle: "light"` in `app.json`): the theme's type requires a
 * light and a dark palette, so both are filled in. Only the light values have
 * been checked on a device.
 */
export const surfaceColors = {
  light: {
    page: "#ffffff",
    panelBorder: "#dddddd",
    rowSeparator: "#ececec",
    primaryPressed: "#2c7ac4",
  },
  dark: {
    page: "#161512",
    panelBorder: "#3a3835",
    rowSeparator: "#2f2d2a",
    primaryPressed: "#2c7ac4",
  },
} as const satisfies Record<"light" | "dark", SurfaceColors>;

/** The surface tokens of one color scheme. */
export type SurfaceColors = {
  /**
   * The page: what `Screen`, the stack header and content, and the
   * full-screen loading view are painted with.
   *
   * Not `colors.background`: that grey stays as the recessed fill laid on a
   * panel (board input keys, preview wells, file/rank buttons — over ten
   * places). Turning `background` white would melt all of those into the
   * page, so the page got its own token instead.
   */
  page: string;
  /**
   * The 1px border around a panel (card, list, the top edge of a bottom bar).
   *
   * Paler than `colors.border` (`#cccccc`), which stays the border of form
   * controls (text fields, choice chips, board keys): on a white page, a
   * panel bordered as dark as an input reads as one big input. A full 1px is
   * used rather than a hairline, which vanishes on white on some devices.
   */
  panelBorder: string;
  /**
   * The 1px line between rows inside a panel, spanning the panel's full
   * width. One step paler than `panelBorder` so the rows read as parts of
   * one panel rather than as separate panels.
   */
  rowSeparator: string;
  /** The primary button's fill while it is pressed. */
  primaryPressed: string;
};

/**
 * The type of `useTheme().colors`: the shared palette plus the surface
 * tokens. A subtype of `ThemeColors`, so it passes as-is to any function
 * that takes `ThemeColors`.
 */
export type AppColors = ThemeColors & SurfaceColors;
