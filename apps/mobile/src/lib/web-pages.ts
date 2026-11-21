import { Linking } from "react-native";

/** The production web app; the pages the app links to live there. */
export const WEB_ORIGIN = "https://www.blindfold-chess.online";

/**
 * Opens a page of the web app in the browser, in the app's language (every
 * web route carries the locale as its first segment). The app opens web
 * pages outside itself rather than in a WebView, so the browser's own
 * sign-in, sharing and back navigation apply.
 */
export function openWebPage(path: string, locale: string): void {
  void Linking.openURL(`${WEB_ORIGIN}/${locale}${path}`);
}
