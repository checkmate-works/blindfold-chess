import { MODULE_HELP_PAGES } from "./module-help-pages";

/**
 * The help sheet's pages for a module: its generated pages, less the
 * how-to-play page when the setup screen already shows that text. Empty
 * when nothing is left, and the setup screen then shows no help button —
 * a sheet that only repeats the screen under it is not worth a tap.
 */
export function helpPagesFor(
  moduleKey: string,
  howToPlayOnSetup: boolean,
): readonly string[] {
  const pages = MODULE_HELP_PAGES[moduleKey] ?? [];
  return howToPlayOnSetup
    ? pages.filter((page) => page !== "howToPlay")
    : pages;
}
