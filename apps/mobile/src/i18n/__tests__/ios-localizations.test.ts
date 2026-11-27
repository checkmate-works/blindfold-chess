import { readFileSync } from "fs";
import { join } from "path";
import { SUPPORTED_LOCALES } from "@blindfold-chess/types";
import { describe, expect, it } from "vitest";

/**
 * The app's languages must be declared to iOS (`CFBundleLocalizations` in
 * `app.json`). The app translates its own text at runtime and ships no
 * `.lproj` folders, so without the list iOS takes the app for English-only
 * and draws the system's own parts in English on a Japanese device — Apple's
 * "Sign in with Apple" button above all, whose text the app cannot set.
 */
describe("iOS localizations", () => {
  it("declares every supported locale in CFBundleLocalizations", () => {
    const appJson = JSON.parse(
      readFileSync(join(__dirname, "../../../app.json"), "utf8"),
    ) as {
      expo: { ios: { infoPlist?: { CFBundleLocalizations?: string[] } } };
    };
    expect(
      [...(appJson.expo.ios.infoPlist?.CFBundleLocalizations ?? [])].sort(),
    ).toEqual([...SUPPORTED_LOCALES].sort());
  });
});
