import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = { children: React.ReactNode };

/**
 * Board-theme preferences for the glossary subtree.
 *
 * The subtree had no provider until the term lists started carrying a native
 * ad card, whose thumbnail is a board and therefore reads the theme. That is
 * a cost the `game-preferences-layout` TSDoc says a static informational
 * route should not pay, and it is paid here deliberately: the index, the
 * letter and category pages and every term's own page are prerendered pages
 * of search-entry traffic, and the cards on them are what the provider buys.
 * The pages stay static — the ad's creatives come from the viewer-independent
 * cached read, not from `resolveNativeAds` (see
 * `GLOSSARY_TERM_LIST_NATIVE_AD_SLOT` and `GLOSSARY_TERM_NATIVE_AD_SLOT`).
 *
 * Written out rather than re-exporting `GamePreferencesLayout` so the
 * provider token stays visible to `game-preferences-coverage.test.ts`.
 */
export default function GlossaryLayout({ children }: Props) {
  return <GamePreferencesProvider>{children}</GamePreferencesProvider>;
}
