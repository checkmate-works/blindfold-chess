import { MODULE_HELP_PAGES } from "./module-help-pages";

/**
 * The pages that say what the module is, which a setup screen with
 * `howToPlayOnSetup` already shows: the web's how-to-play text, or, for a
 * module the web gives no help at all (algebraic notation), the generated
 * "about" page — the module's own description, which that setup screen
 * opens with.
 */
const SETUP_PAGES: ReadonlySet<string> = new Set(["howToPlay", "about"]);

/**
 * The help sheet's pages for a module: its generated pages, less the
 * how-to-play (or about) page when the setup screen already shows that
 * text. Empty when nothing is left, and the setup screen then shows no help
 * button — a sheet that only repeats the screen under it is not worth a tap.
 */
export function helpPagesFor(
  moduleKey: string,
  howToPlayOnSetup: boolean,
): readonly string[] {
  const pages = MODULE_HELP_PAGES[moduleKey] ?? [];
  return howToPlayOnSetup
    ? pages.filter((page) => !SETUP_PAGES.has(page))
    : pages;
}
